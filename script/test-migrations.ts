import "dotenv/config";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { migrationClient, migrationStatus, readMigrations, runMigrations } from "../server/migrations";

if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT || process.env.DB_TARGET === "prod") {
  throw new Error("Migration tests are development-only");
}
const devUrl = process.env.NEON_DATABASE_URL_DEV || process.env.DATABASE_URL;
if (!devUrl) throw new Error("Development database required");
const root = migrationClient(devUrl);
const temp = await mkdtemp(resolve(tmpdir(), "migration-tests-"));
const schemas: string[] = [];
const clients: ReturnType<typeof migrationClient>[] = [];
const children: ReturnType<typeof spawn>[] = [];
const suiteId = Date.now();

async function isolated() {
  const schema = `migration_test_${suiteId}_${schemas.length}`;
  await root.query(`CREATE SCHEMA "${schema}"`);
  schemas.push(schema);
  const client = migrationClient(devUrl!);
  await client.connect();
  // These are dedicated DIRECT clients, never transaction-pooled connections.
  await client.query(`SET search_path TO "${schema}"`);
  clients.push(client);
  return { client, schema };
}
async function fixture(name: string, sql: string) {
  await writeFile(resolve(temp, name), sql);
}
async function builtServer(schema: string, shouldStart: boolean) {
  const url = new URL(devUrl!);
  // Explicit direct endpoint for startup search_path isolation too.
  if (url.hostname.endsWith(".neon.tech")) url.hostname = url.hostname.replace(/-pooler(?=\.)/, "");
  url.searchParams.set("options", `-c search_path=${schema}`);
  const port = 6100 + schemas.length;
  const env = { ...process.env, NODE_ENV: "production", PORT: String(port),
    NEON_DATABASE_URL_PROD: url.toString(), DATABASE_URL: url.toString() };
  // Test subprocess only: never change configured secrets/flags. Boot must not seed fixtures.
  delete env.ENABLE_SEED;
  delete env.REPLIT_DEPLOYMENT;
  const child = spawn(process.execPath, ["dist/index.cjs"], { env, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  let output = "";
  child.stdout!.on("data", chunk => { output += chunk; });
  child.stderr!.on("data", chunk => { output += chunk; });
  for (let i = 0; i < 150; i++) {
    if (child.exitCode !== null || output.includes("serving on port")) break;
    await delay(200);
  }
  if (shouldStart) {
    assert.ok(output.includes("serving on port"), `Built server did not listen: ${output.slice(-1500)}`);
    assert.ok(output.includes("Applied 013_session_table.sql"), "Built server did not migrate");
    const response = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(response.status, 200);
  } else {
    assert.notEqual(child.exitCode, null, "Failed migration must terminate built server");
    assert.notEqual(child.exitCode, 0);
    assert.ok(output.includes("Startup refused:"));
    assert.ok(!output.includes("serving on port"));
  }
  if (child.exitCode === null) {
    child.kill("SIGTERM");
    await once(child, "exit");
  }
}

try {
  await root.connect();
  await fixture("001_first.sql", "BEGIN; CREATE TABLE marker(id integer); COMMIT;");
  await fixture("002_second.sql", "ALTER TABLE marker ADD COLUMN label text;");
  const first = await isolated();
  assert.equal((await migrationStatus(first.client, temp))[0].status, "pending");
  assert.equal((await first.client.query("SELECT to_regclass('schema_migrations') AS name")).rows[0].name, null);
  console.log("PASS status is read-only, without creating history");
  assert.equal((await runMigrations(first.client, { directory: temp })).length, 2);
  assert.equal((await runMigrations(first.client, { directory: temp })).length, 0);
  assert.ok((await migrationStatus(first.client, temp)).every(row => row.status === "applied"));
  console.log("PASS pending application and applied-file skip");
  await fixture("002_second.sql", "-- changed\nALTER TABLE marker ADD COLUMN label text;");
  await assert.rejects(runMigrations(first.client, { directory: temp }), /checksum changed/);
  await fixture("002_second.sql", "ALTER TABLE marker ADD COLUMN label text;");
  await unlink(resolve(temp, "002_second.sql"));
  await assert.rejects(runMigrations(first.client, { directory: temp }), /file missing/);
  await fixture("002_second.sql", "ALTER TABLE marker ADD COLUMN label text;");
  console.log("PASS checksum-change and missing-file refusal");

  await fixture("003_broken.sql", "CREATE TABLE must_rollback(id integer); SELECT nonexistent_column;");
  await assert.rejects(runMigrations(first.client, { directory: temp }), /003_broken.sql/);
  assert.equal((await first.client.query("SELECT to_regclass('must_rollback') AS name")).rows[0].name, null);
  assert.equal((await first.client.query("SELECT count(*)::int AS n FROM schema_migrations")).rows[0].n, 2);
  await unlink(resolve(temp, "003_broken.sql"));
  console.log("PASS failed migration rolls back DDL and history");

  const legacy = await isolated();
  await legacy.client.query("CREATE TABLE vendors(taking_bookings boolean)");
  await assert.rejects(runMigrations(legacy.client), /Baseline required/);
  await assert.rejects(runMigrations(legacy.client, { baseline: true }), /Cannot baseline/);
  console.log("PASS legacy schema requires baseline and incomplete baseline is refused");

  const concurrent = await isolated();
  const second = migrationClient(devUrl);
  await second.connect();
  clients.push(second);
  await second.query(`SET search_path TO "${concurrent.schema}"`);
  await fixture("003_slow.sql", "SELECT pg_sleep(0.5); ALTER TABLE marker ADD COLUMN extra integer;");
  const [a, b] = await Promise.all([
    runMigrations(concurrent.client, { directory: temp }),
    runMigrations(second, { directory: temp }),
  ]);
  assert.equal(a.length + b.length, 3);
  assert.ok(a.length === 0 || b.length === 0);
  assert.equal((await second.query("SELECT count(*)::int AS n FROM schema_migrations")).rows[0].n, 3);
  console.log("PASS concurrent starts serialized by advisory lock");

  const built = await isolated();
  const tables = await root.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('schema_migrations','session')");
  for (const { tablename } of tables.rows) {
    const safe = tablename.replace(/"/g, '""');
    await built.client.query(`CREATE TABLE "${safe}" (LIKE public."${safe}" INCLUDING ALL)`);
  }
  const before = await built.client.query("SELECT to_regclass('session') AS name");
  assert.equal(before.rows[0].name, null);
  await runMigrations(built.client, { baseline: true });
  assert.equal((await built.client.query("SELECT count(*)::int AS n FROM schema_migrations")).rows[0].n, 5);
  assert.equal((await built.client.query("SELECT to_regclass('session') AS name")).rows[0].name, null);
  for (const file of await readMigrations()) {
    assert.equal(await readFile(resolve("dist/migrations", file.filename), "utf8"), file.sql);
  }
  await builtServer(built.schema, true);
  assert.ok((await built.client.query("SELECT to_regclass('session') AS name")).rows[0].name);
  console.log("PASS baseline records legacy files without execution; packaged SQL matches source");
  console.log("PASS production bundle starts, applies 013 and serves HTTP 200 against disposable DEV schema");
  await built.client.query("UPDATE schema_migrations SET checksum=repeat('0',64) WHERE filename='013_session_table.sql'");
  await builtServer(built.schema, false);
  console.log("PASS production bundle exits non-zero without listening on migration integrity failure");
} finally {
  for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
  for (const client of clients) await client.end();
  for (const schema of schemas) await root.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await root.end();
  await rm(temp, { recursive: true, force: true });
}
