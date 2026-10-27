/** Real HTTP/auth/SQL, disposable development schema. No production or seed imports. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { scryptSync } from "node:crypto";
import express from "express";
import path from "node:path";
import { isolatePricingPool } from "./isolated-pricing-db";

if (process.env.REPLIT_DEPLOYMENT || process.env.NODE_ENV === "production" || process.env.DB_TARGET === "prod") throw Error("Development only");
const { pool } = await import("../server/db");
const { registerRoutes } = await import("../server/routes");
const schema = `pricing_test_${Date.now()}`;
const quoted = `"${schema}"`;
const app = express();
app.use(express.json());
const server = createServer(app);
let listening = false;
try {
  await pool.query(`CREATE SCHEMA ${quoted}`);
  isolatePricingPool(pool, schema);
  for (const table of ["users", "countries", "vendors", "vendor_documents", "experiences", "experience_images", "availability_slots", "bookings", "pricing_settings", "site_settings", "waiting_list", "favorites", "reviews"]) {
    await pool.query(`CREATE TABLE ${quoted}.${table} (LIKE public.${table} INCLUDING ALL)`);
    await pool.query(`CREATE SEQUENCE ${quoted}.${table}_fixture_seq START 1000`);
    await pool.query(`ALTER TABLE ${quoted}.${table} ALTER COLUMN id SET DEFAULT nextval('${schema}.${table}_fixture_seq')`);
  }
  const salt = "application-fixture";
  const hash = `${scryptSync("ApplicationTest123", salt, 64).toString("hex")}.${salt}`;
  await pool.query("INSERT INTO users(id,email,password,full_name,role) VALUES(1,'application-admin@test.invalid',$1,'Application test admin','admin')", [hash]);
  await pool.query("INSERT INTO countries(id,name,code,currency_code) VALUES(1,'Sri Lanka','LK','LKR')");
  await pool.query("INSERT INTO pricing_settings(id) VALUES(1)");
  await pool.query("INSERT INTO site_settings(id,show_demo_content,bookings_open) VALUES(1,true,false)");
  await registerRoutes(server, app);
  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(500).json({ message: error.message }));
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  listening = true;
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const login = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "application-admin@test.invalid", password: "ApplicationTest123" }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie")!.split(";")[0];
  const activities = [
    { name: "Pottery workshop", category: "arts", priceAmount: 2500, differentVisitorPrice: true, visitorPriceUsd: 10, groupSizes: ["2", "3-5"], description: "Create a bowl with your friends." },
    { name: "Social futsal", category: "sports", priceAmount: 1500, differentVisitorPrice: false, visitorPriceUsd: null, groupSizes: ["6+"], description: "A friendly game for your team." },
  ];
  const application = { businessName: "Two activity test business", contactName: "Test host", contactEmail: "two-activities@test.invalid", contactPhone: "+94771234567", city: "Colombo", address: "Test meeting place", description: "A studio and sports host.", acceptTerms: true, activities };
  const submit = async (body: unknown, withId = true) => {
    const form = new FormData(); form.append("application", JSON.stringify(body));
    if (withId) form.append("idCopy", new Blob([Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF")], { type: "application/pdf" }), "test-id.pdf");
    return fetch(base + "/api/vendor-applications", { method: "POST", body: form });
  };
  assert.equal((await submit(application, false)).status, 400);
  assert.equal((await submit({ ...application, acceptTerms: false })).status, 400);
  console.log("PASS: Missing ID and unticked terms rejected by server");
  for (const badActivities of [
    [],
    Array.from({ length: 11 }, () => activities[0]),
    [{ ...activities[0], priceAmount: 25.5 }],
    [{ ...activities[0], visitorPriceUsd: null }],
    [{ ...activities[0], description: "Call +94771234567" }],
    [{ ...activities[0], description: "x".repeat(301) }],
    [{ ...activities[0], category: "other" }],
  ]) assert.equal((await submit({ ...application, activities: badActivities })).status, 400);
  console.log("PASS: Activity limit, whole prices, visitor requirement, category and contact/length validation");
  const response = await submit(application); assert.equal(response.status, 200);
  const vendor = await response.json();
  assert.deepEqual(vendor.applicationActivities, activities);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM experiences WHERE vendor_id=$1", [vendor.id])).rows[0].n, 0);
  const approve = () => fetch(`${base}/api/admin/vendors/${vendor.id}/approve`, { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: "{}" });
  assert.equal((await approve()).status, 200);
  const drafts = (await pool.query("SELECT * FROM experiences WHERE vendor_id=$1 ORDER BY id", [vendor.id])).rows;
  assert.equal(drafts.length, 2);
  drafts.forEach((draft, index) => {
    assert.equal(draft.title, activities[index].name);
    assert.equal(draft.category, activities[index].category);
    assert.equal(draft.price_amount, activities[index].priceAmount);
    assert.equal(draft.visitor_price_usd, activities[index].visitorPriceUsd);
    assert.deepEqual(draft.typical_group_sizes, activities[index].groupSizes);
    assert.equal(draft.description, activities[index].description);
    assert.equal(draft.status, "draft"); assert.equal(draft.currency_code, "LKR");
    assert.equal(draft.image_url, null); assert.equal(draft.capacity, null);
    assert.equal(draft.is_demo, false);
  });
  assert.equal((await approve()).status, 409);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM experiences WHERE vendor_id=$1", [vendor.id])).rows[0].n, 2);
  console.log("PASS: Two activities saved; approval creates exactly two correctly priced drafts, repeated approval refused");
  const { activities: _activities, ...common } = application;
  const legacy = await submit({ ...common, contactEmail: "legacy-application@test.invalid", activityTypes: ["arts"], groupSizes: ["2"], typicalPrice: 2200 });
  assert.equal(legacy.status, 200);
  const oldVendor = await legacy.json(); assert.equal(oldVendor.applicationActivities, null);
  assert.ok(oldVendor.description.includes("Typical price: LKR 2200"));
  assert.equal((await fetch(`${base}/api/admin/vendors/${oldVendor.id}/approve`, { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: "{}" })).status, 200);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM experiences WHERE vendor_id=$1", [oldVendor.id])).rows[0].n, 0);
  console.log("PASS: Legacy single-price/category application remains readable and approvable without invented listings");
  if (process.argv.includes("--screenshots")) {
    app.use(express.static(path.resolve("dist/public")));
    app.get("/{*splat}", (_req, res) => res.sendFile(path.resolve("dist/public/index.html")));
    console.log(`SCREENSHOT_FIXTURE_READY ${base} pid=${process.pid}`);
    await new Promise<void>(resolve => { process.once("SIGTERM", resolve); process.once("SIGINT", resolve); });
  }
} finally {
  if (listening) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  await pool.query(`DROP SCHEMA IF EXISTS ${quoted} CASCADE`);
  await pool.end();
}
