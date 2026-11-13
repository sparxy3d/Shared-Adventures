/** DEV-only real SQL/HTTP regression. Every write stays in a disposable schema. */
import assert from "node:assert/strict";
import express from "express";
import { createServer, request } from "node:http";
import { readFile } from "node:fs/promises";
import { scryptSync } from "node:crypto";
import type { Request } from "express";
import { isolatePricingPool } from "./isolated-pricing-db";

if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT || process.env.DB_TARGET === "prod") throw Error("Development only");
const { pool } = await import("../server/db");
const { storage, DatabaseStorage } = await import("../server/storage");
const { registerRoutes } = await import("../server/routes");
const { applicationUpload } = await import("../server/vendor-documents");
const { canonicalClientIp, applicationKey, applicationClientIp } = await import("../server/application-limits");
const schema = `pricing_test_${Date.now()}`;
const servers: ReturnType<typeof createServer>[] = [];
let parsed = 0;
let blockedRead = false;
const key = (scope: "ip" | "email", input: string) => applicationKey(scope, input);
const clear = () => pool.query("TRUNCATE application_submission_attempts");
const count = async (table: string) => Number((await pool.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n);
try {
  await pool.query(`CREATE SCHEMA "${schema}"`);
  isolatePricingPool(pool, schema);
  await pool.query(await readFile("migrations/014_application_submission_limits.sql", "utf8"));
  await pool.query(await readFile("migrations/013_session_table.sql", "utf8"));
  for (const table of ["users", "countries", "vendors", "vendor_documents", "experiences", "experience_images", "availability_slots", "bookings", "pricing_settings", "site_settings", "waiting_list", "favorites", "reviews"]) {
    await pool.query(`CREATE TABLE "${schema}".${table} (LIKE public.${table} INCLUDING ALL)`);
    await pool.query(`CREATE SEQUENCE "${schema}".${table}_fixture_seq START 1000`);
    await pool.query(`ALTER TABLE "${schema}".${table} ALTER COLUMN id SET DEFAULT nextval('${schema}.${table}_fixture_seq')`);
  }
  await pool.query("INSERT INTO countries(id,name,code,currency_code) VALUES(1,'Sri Lanka','LK','LKR')");
  await pool.query("INSERT INTO pricing_settings(id) VALUES(1)");
  await pool.query("INSERT INTO site_settings(id) VALUES(1)");
  assert.equal(canonicalClientIp("::ffff:192.0.2.1"), canonicalClientIp("192.0.2.1"));
  assert.equal(canonicalClientIp("2001:0db8:0:0:0:0:0:1"), canonicalClientIp("2001:db8::1"));
  assert.throws(() => canonicalClientIp("not-an-ip"));
  const proxyRequest = (header: string, socket = "127.0.0.1") => ({
    app: { get: () => 1 }, socket: { remoteAddress: socket }, headers: { "x-forwarded-for": header },
  }) as unknown as Request;
  assert.equal(applicationClientIp(proxyRequest("203.0.113.200, 198.51.100.8, 10.0.0.2, 127.0.0.1")), "198.51.100.8");
  assert.equal(applicationClientIp(proxyRequest("203.0.113.200", "198.51.100.9")), "198.51.100.9");
  assert.throws(() => applicationClientIp(proxyRequest("not-an-ip")));
  console.log("PASS trusted internal proxy walk stops at nearest untrusted peer; direct public peers cannot spoof forwarding");
  assert.notEqual(key("ip", "identity"), key("email", "identity"));
  const peers = [new DatabaseStorage(), new DatabaseStorage()];
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) =>
    peers[i % 2].reserveApplicationAttempt("ip", key("ip", "192.0.2.1"))));
  assert.equal(results.filter(r => r.allowed).length, 3);
  assert.equal(await count("application_submission_attempts"), 3);
  assert.equal((await new DatabaseStorage().reserveApplicationAttempt("ip", key("ip", "192.0.2.1"))).allowed, false);
  console.log("PASS shared concurrent admission: exactly 3/20; reconstructed service retains state");
  await pool.query("UPDATE application_submission_attempts SET attempted_at=clock_timestamp()-interval '61 minutes'");
  assert.equal((await storage.reserveApplicationAttempt("ip", key("ip", "192.0.2.1"))).allowed, true);
  await clear();
  await pool.query(`INSERT INTO application_submission_attempts(scope,key_hash,attempted_at)
    SELECT 'ip',$1,clock_timestamp()-interval '2 hours' FROM generate_series(1,10)`, [key("ip", "192.0.2.1")]);
  const daily = await storage.reserveApplicationAttempt("ip", key("ip", "192.0.2.1"));
  assert.equal(daily.allowed, false); assert.ok(daily.retryAfter > 21 * 3600 && daily.retryAfter <= 22 * 3600);
  await pool.query("UPDATE application_submission_attempts SET attempted_at=clock_timestamp()-interval '25 hours'");
  assert.equal((await storage.reserveApplicationAttempt("ip", key("ip", "192.0.2.1"))).allowed, true);
  await clear();
  await pool.query(`INSERT INTO application_submission_attempts(scope,key_hash,attempted_at)
    SELECT 'email',$1,clock_timestamp()-interval '49 hours' FROM generate_series(1,501)`, [key("email", "old@test.invalid")]);
  await storage.reserveApplicationAttempt("email", key("email", "new@test.invalid"));
  assert.equal(await count("application_submission_attempts"), 2); // one old, one fresh
  await storage.reserveApplicationAttempt("email", key("email", "new@test.invalid"));
  assert.equal(await count("application_submission_attempts"), 2); // two fresh
  console.log("PASS rolling hour/day expiry, retry calculation and bounded 500-row cleanup");

  for (let i = 0; i < 2; i++) {
    const app = express(); app.use(express.json());
    app.use((req, res, next) => {
      // Fixture-only identity simulates independent clients, never shipped.
      if (req.headers["x-fixture-ip"]) Object.defineProperty(req, "ip", { value: String(req.headers["x-fixture-ip"]) });
      res.on("finish", () => {
        if (res.statusCode === 429 && req.path === "/api/vendor-applications" && !req.headers["x-email-test"]) {
          blockedRead ||= req.readableDidRead;
        }
      });
      next();
    });
    const server = createServer(app); servers.push(server);
    await registerRoutes(server, app);
    // Standalone fixture peers are not Replit's proxy, even when this script runs there.
    app.set("trust proxy", false);
    type Layer = { handle: express.RequestHandler; route?: { path: string; stack: Layer[] } };
    const layers = (app as unknown as { router: { stack: Layer[] } }).router.stack;
    const upload = layers.find(l => l.route?.path === "/api/vendor-applications")!.route!.stack.find(l => l.handle === applicationUpload)!;
    const original = upload.handle;
    upload.handle = (req, res, next) => { parsed++; original(req, res, next); };
    app.use((_error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(500).json({ message: "Fixture failure" }));
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  }
  const bases = servers.map(s => {
    const a = s.address(); assert.ok(a && typeof a !== "string"); return `http://127.0.0.1:${a.port}`;
  });
  const application = {
    businessName: "Limiter test business", contactName: "Test owner", contactEmail: "limiter@test.invalid",
    contactPhone: "+94771234567", city: "Colombo", address: "Fixture place", description: "A test business.",
    acceptTerms: true, activityTypes: ["arts"], groupSizes: ["2"], typicalPrice: 2500,
  };
  const submit = (email: string, ip?: string, cookie?: string, instance = 0) => {
    const form = new FormData();
    // File first proves metadata ordering cannot defeat the early gate.
    form.append("idCopy", new Blob(["%PDF-1.4\nfixture"], { type: "application/pdf" }), "id.pdf");
    form.append("application", JSON.stringify({ ...application, contactEmail: email }));
    return fetch(bases[instance] + "/api/vendor-applications", { method: "POST", body: form,
      headers: { ...(ip ? { "x-fixture-ip": ip } : {}), ...(cookie ? { Cookie: cookie } : {}),
        "X-Forwarded-For": "203.0.113.88", ...(email.includes("limiter") ? { "x-email-test": "1" } : {}) } });
  };
  await clear(); parsed = 0;
  const concurrent = await Promise.all(Array.from({ length: 8 }, (_, i) => submit(`invalid-${i}@test.invalid`, "198.51.100.1", undefined, i % 2)));
  // Complete payloads may succeed: use distinct emails. No more than 3 reach parser.
  assert.equal(concurrent.filter(r => r.status === 429).length, 5); assert.equal(parsed, 3);
  assert.equal(blockedRead, false);
  const refusal = concurrent.find(r => r.status === 429)!;
  assert.ok(Number(refusal.headers.get("retry-after")) > 0);
  assert.equal(refusal.headers.get("cache-control"), "no-store");
  assert.match((await refusal.json()).message, /try again in/);
  // Blocked chunked body, sent without Content-Length.
  const before = parsed;
  const chunkStatus = await new Promise<number>((resolve, reject) => {
    const r = request(bases[0] + "/api/vendor-applications", { method: "POST", headers: {
      "Content-Type": "multipart/form-data; boundary=test", "x-fixture-ip": "198.51.100.1",
    } }, res => { res.resume(); res.on("end", () => resolve(res.statusCode!)); });
    r.on("error", reject); r.write("--test\r\n"); r.end("file-first-unparsed\r\n--test--\r\n");
  });
  assert.equal(chunkStatus, 429); assert.equal(parsed, before); assert.equal(blockedRead, false);
  // Untrusted forwarding alone cannot change the direct client's identity.
  await clear(); parsed = 0;
  for (const [i, forwarded] of ["203.0.113.1", "203.0.113.2", "203.0.113.3", "203.0.113.4"].entries()) {
    const r = await fetch(bases[0] + "/api/vendor-applications", { method: "POST",
      headers: { "Content-Type": "multipart/form-data; boundary=none", "X-Forwarded-For": forwarded }, body: "--none--" });
    assert.equal(r.status, i < 3 ? 400 : 429);
  }
  assert.equal(parsed, 3);
  console.log("PASS two HTTP apps share IP ceiling; file-first/chunked denied before parser/body reads; untrusted forwarding ignored");

  await clear();
  const beforeEmail = await count("vendors");
  for (let i = 0; i < 3; i++) {
    const r = await submit(i % 2 ? "  LIMITER@test.invalid  " : "limiter@test.invalid", `198.51.100.${10 + i}`);
    assert.equal(r.status, i ? 400 : 200);
  }
  const rowCounts = await Promise.all(["users", "vendors", "vendor_documents"].map(count));
  const emailDenied = await submit("limiter@test.invalid", "198.51.100.15");
  assert.equal(emailDenied.status, 429);
  assert.equal(await count("vendors"), beforeEmail + 1);
  assert.deepEqual(await Promise.all(["users", "vendors", "vendor_documents"].map(count)), rowCounts);
  console.log("PASS normalized email limit across IPs; blocked email writes no users/vendors/documents");

  const originalReserve = storage.reserveApplicationAttempt;
  try {
    storage.reserveApplicationAttempt = async () => { throw Error("Deliberate isolated outage"); };
    const beforeParser = parsed;
    assert.equal((await submit("outage@test.invalid", "198.51.100.200")).status, 503);
    assert.equal(parsed, beforeParser);
    storage.reserveApplicationAttempt = async (scope, hash) => {
      if (scope === "email") throw Error("Deliberate email-stage outage");
      return originalReserve.call(storage, scope, hash);
    };
    const counts = await Promise.all(["users", "vendors", "vendor_documents"].map(count));
    assert.equal((await submit("outage-email@test.invalid", "198.51.100.201")).status, 503);
    assert.deepEqual(await Promise.all(["users", "vendors", "vendor_documents"].map(count)), counts);
  } finally { storage.reserveApplicationAttempt = originalReserve; }
  console.log("PASS IP outage fails before parser; email outage fails before application writes");

  const salt = "limit-fixture", hash = `${scryptSync("LimitFixture123", salt, 64).toString("hex")}.${salt}`;
  await pool.query("INSERT INTO users(id,email,password,full_name,role) VALUES(1,'admin@test.invalid',$1,'Test admin','admin'),(2,'owner@test.invalid',$1,'Test owner','customer')", [hash]);
  await pool.query("INSERT INTO vendors(id,owner_profile_id,business_name,verification_status) VALUES(2,2,'Rejected fixture','rejected')");
  const login = async (email: string) => {
    const r = await fetch(bases[0] + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "LimitFixture123" }) });
    assert.equal(r.status, 200); return r.headers.get("set-cookie")!.split(";")[0];
  };
  const admin = await login("admin@test.invalid"), owner = await login("owner@test.invalid");
  const beforeAdmin = parsed;
  assert.equal((await submit("admin@test.invalid", "198.51.100.220", admin)).status, 400);
  assert.equal(parsed, beforeAdmin);
  assert.equal((await fetch(bases[0] + "/api/admin/vendors", { headers: { Cookie: admin } })).status, 200);
  assert.equal((await submit("owner@test.invalid", "198.51.100.221", owner)).status, 200);
  assert.equal((await pool.query("SELECT verification_status FROM vendors WHERE id=2")).rows[0].verification_status, "pending");
  assert.equal((await pool.query("SELECT count(*) AS n FROM vendors WHERE owner_profile_id=2")).rows[0].n, "1");
  console.log("PASS admin refusal before upload, guarded admin access, declined owner reapplication without duplicate");
  const columns = (await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='application_submission_attempts'", [schema])).rows.map(r => r.column_name);
  assert.deepEqual(columns.sort(), ["id", "scope", "key_hash", "attempted_at"].sort());
  assert.equal((await pool.query("SELECT count(*) AS n FROM application_submission_attempts WHERE key_hash !~ '^[0-9a-f]{64}$'")).rows[0].n, "0");
  console.log("PASS enforcement records contain only scoped digests/timestamps, no raw identities");
} finally {
  for (const server of servers) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await pool.end();
}
