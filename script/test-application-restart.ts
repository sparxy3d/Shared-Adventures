/** A fresh process must see existing admission state; child secret outage is local only. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Response } from "express";
import { isolatePricingPool } from "./isolated-pricing-db";
if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT || process.env.DB_TARGET === "prod") throw Error("Development only");
const { pool } = await import("../server/db");
const { storage } = await import("../server/storage");
const { applicationKey, admitApplication } = await import("../server/application-limits");
const mode = process.argv[2];
if (mode === "--reader") {
  try {
    isolatePricingPool(pool, process.argv[3]);
    const result = await storage.reserveApplicationAttempt("ip", process.argv[4]);
    assert.equal(result.allowed, false); assert.ok(result.retryAfter > 0);
    console.log("PASS new process observes existing shared quota");
  } finally { await pool.end(); }
} else if (mode === "--missing-secret") {
  let status = 0, checkedStore = false;
  const response = {
    set: () => response,
    status: (value: number) => { status = value; return response; },
    json: () => response,
  } as unknown as Response;
  try {
    assert.equal(await admitApplication("ip", "192.0.2.1", response, {
      reserveApplicationAttempt: async () => { checkedStore = true; return { allowed: true, retryAfter: 0 }; },
    }), false);
    assert.equal(status, 503); assert.equal(checkedStore, false);
    console.log("PASS missing secret fails closed before store/admission");
  } finally { await pool.end(); }
} else {
  const schema = `pricing_test_${Date.now()}`;
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`);
    isolatePricingPool(pool, schema);
    await pool.query(await readFile("migrations/014_application_submission_limits.sql", "utf8"));
    const digest = applicationKey("ip", "192.0.2.1");
    for (let i = 0; i < 3; i++) assert.equal((await storage.reserveApplicationAttempt("ip", digest)).allowed, true);
    const run = promisify(execFile);
    for (const [args, env] of [
      [["--reader", schema, digest], process.env],
      [["--missing-secret"], { ...process.env, SESSION_SECRET: "" }],
    ] as const) {
      const result = await run(process.execPath, ["--import", "tsx", "script/test-application-restart.ts", ...args],
        { env, timeout: 30000 });
      console.log(result.stdout.trim());
    }
  } finally {
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await pool.end();
  }
}
