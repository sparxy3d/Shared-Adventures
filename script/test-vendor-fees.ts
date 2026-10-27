/**
 * Real HTTP/SQL fee tests in disposable development schemas only.
 * NODE_ENV=development npx tsx script/test-vendor-fees.ts [--screenshots]
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { scryptSync } from "node:crypto";
import express from "express";
import path from "node:path";
import { commissionForVendor } from "../shared/pricing";
import { isolatePricingPool } from "./isolated-pricing-db";

if (process.env.REPLIT_DEPLOYMENT || process.env.NODE_ENV === "production" || process.env.DB_TARGET === "prod") throw new Error("Development only");
const { pool } = await import("../server/db");
const { storage } = await import("../server/storage");
const { registerRoutes } = await import("../server/routes");
const schema = `pricing_test_${Date.now()}`;
const app = express();
app.use(express.json());
const server = createServer(app);
let listening = false;
const password = "FeeFixtureTest123";
try {
  await pool.query(`CREATE SCHEMA "${schema}"`);
  isolatePricingPool(pool, schema);
  for (const table of ["users", "countries", "vendors", "vendor_documents", "experiences", "experience_images", "availability_slots", "bookings", "pricing_settings", "site_settings", "waiting_list", "favorites", "reviews"]) {
    await pool.query(`CREATE TABLE "${schema}".${table} (LIKE public.${table} INCLUDING ALL)`);
    await pool.query(`CREATE SEQUENCE "${schema}".${table}_fixture_seq START 1000`);
    await pool.query(`ALTER TABLE "${schema}".${table} ALTER COLUMN id SET DEFAULT nextval('${schema}.${table}_fixture_seq')`);
  }
  await pool.query("INSERT INTO pricing_settings(id,usd_to_lkr_rate) VALUES(1,300)");
  await pool.query("INSERT INTO countries(id,name,code,currency_code) VALUES(1,'Sri Lanka','LK','LKR')");
  await pool.query("INSERT INTO site_settings(id,show_demo_content,bookings_open) VALUES(1,true,true)");
  const salt = "fee-test-fixture";
  const hash = `${scryptSync(password, salt, 64).toString("hex")}.${salt}`;
  for (const [id, role] of [[1, "admin"], [2, "customer"], [3, "customer"], [4, "customer"]] as const) {
    await pool.query("INSERT INTO users(id,email,password,full_name,role,is_sri_lankan_resident) VALUES($1,$2,$3,$4,$5,true)",
      [id, `fee-${id}@test.invalid`, hash, `Fee fixture ${id}`, role]);
  }
  for (const id of [1, 2]) await pool.query("INSERT INTO vendors(id,owner_profile_id,business_name,verification_status,city) VALUES($1,$2,$3,'pending','Colombo')",
    [id, id + 2, id === 1 ? "Default fee vendor" : "Custom fee vendor"]);
  await registerRoutes(server, app);
  app.use(express.static(path.resolve("dist/public")));
  app.get("/{*splat}", (_req, res) => res.sendFile(path.resolve("dist/public/index.html")));
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  listening = true;
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const call = async (url: string, method = "GET", body?: unknown, cookie = "") => {
    const response = await fetch(base + url, { method, headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(cookie ? { Cookie: cookie } : {}),
    }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json(), response };
  };
  const login = async (id: number) => {
    const result = await call("/api/auth/login", "POST", { email: `fee-${id}@test.invalid`, password });
    assert.equal(result.status, 200);
    return result.response.headers.get("set-cookie")!.split(";")[0];
  };
  const admin = await login(1), member = await login(2);
  const defaultPlan = { introductoryRate: 10, introductoryMonths: 3, standardRate: 15 };
  const customPlan = { introductoryRate: 8, introductoryMonths: 6, standardRate: 12 };
  assert.equal(commissionForVendor({
    firstListingPublishedAt: "2026-09-30T20:30:00Z", commissionOverrideRate: null,
  }, defaultPlan, new Date("2026-10-01T00:00:00Z")).introductoryEndsAt, "2026-12-31T20:30:00.000Z");
  assert.equal((await call("/api/admin/vendors/1/approve", "POST", {}, admin)).status, 200);
  assert.equal((await call("/api/admin/vendors/2/approve", "POST", { feePlan: customPlan }, admin)).status, 200);
  const vendorCookie = await login(3);
  const defaults = await storage.getPricingSettings();
  for (const [id, plan] of [[1, defaultPlan], [2, customPlan]] as const) {
    const vendor = (await storage.getVendor(id))!;
    assert.equal(vendor.firstListingPublishedAt, null);
    assert.equal(Number(vendor.commissionIntroductoryRate), plan.introductoryRate);
    assert.equal(Number(vendor.commissionStandardRate), plan.standardRate);
    assert.equal(vendor.commissionIntroductoryMonths, plan.introductoryMonths);
    const before = commissionForVendor(vendor, defaults);
    assert.equal(before.rate, plan.introductoryRate);
    assert.equal(before.introductoryNotStarted, true);
    assert.equal(before.introductoryEndsAt, null);
    const published = new Date("2026-01-15T04:30:00Z");
    const atEnd = new Date(published);
    atEnd.setUTCMonth(atEnd.getUTCMonth() + plan.introductoryMonths);
    assert.equal(commissionForVendor({ ...vendor, firstListingPublishedAt: published }, defaults, new Date(atEnd.getTime() - 1)).rate, plan.introductoryRate);
    assert.equal(commissionForVendor({ ...vendor, firstListingPublishedAt: published }, defaults, atEnd).rate, plan.standardRate);
    console.log(`PASS: Approved vendor ${id}: ${plan.introductoryRate}% before publication and through ${plan.introductoryMonths} months; ${plan.standardRate}% at expiry`);
  }
  assert.equal((await call("/api/vendor/dashboard", "GET", undefined, vendorCookie)).data.commission.rate, 10);
  for (const id of [1, 2]) {
    await pool.query("INSERT INTO experiences(id,vendor_id,title,category,city,price_amount,capacity,status) VALUES($1,$1,$2,'sports','Colombo',2500,100,'draft')", [id, `Fee activity ${id}`]);
    await storage.updateExperience(id, { status: "published" });
    await pool.query("INSERT INTO availability_slots(id,experience_id,date,start_time,end_time,capacity) VALUES($1,$1,$2,'10:00','11:00',100)",
      [id, new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10)]);
  }
  const book = async (id: number) => {
    const result = await call("/api/bookings", "POST", { experienceId: id, slotId: id, qty: 2, residentCount: 2, visitorCount: 0, totalAmount: 1, commissionRateApplied: 0 }, member);
    assert.equal(result.status, 200);
    return result.data;
  };
  const first = await book(1), custom = await book(2);
  assert.equal(Number(first.commissionRateApplied), 10);
  assert.equal(first.totalAmount, 5000); assert.equal(first.commissionAmountLkr, 500); assert.equal(first.vendorNetAmountLkr, 4500);
  assert.equal(Number(custom.commissionRateApplied), 8); assert.equal(custom.commissionAmountLkr, 400);
  await pool.query("UPDATE vendors SET first_listing_published_at=now()-interval '4 months' WHERE id=1");
  await pool.query("UPDATE vendors SET first_listing_published_at=now()-interval '7 months' WHERE id=2");
  assert.equal(Number((await book(1)).commissionRateApplied), 15);
  assert.equal(Number((await book(2)).commissionRateApplied), 12);
  console.log("PASS: Real bookings charge 10% then 15%; custom plan charges 8% then 12%; totals recalculated");
  assert.equal((await call("/api/admin/vendors/1/commission", "PATCH", customPlan, admin)).status, 200);
  await call("/api/admin/pricing-settings", "PATCH", { introductoryRate: 5, standardRate: 25 }, admin);
  const stored = (await pool.query("SELECT commission_rate_applied,total_amount,commission_amount_lkr,vendor_net_amount_lkr FROM bookings WHERE id=$1", [first.id])).rows[0];
  assert.equal(Number(stored.commission_rate_applied), 10);
  assert.equal(stored.total_amount, 5000); assert.equal(stored.commission_amount_lkr, 500); assert.equal(stored.vendor_net_amount_lkr, 4500);
  assert.equal(Number((await book(1)).commissionRateApplied), 8);
  assert.equal(Number((await book(2)).commissionRateApplied), 12);
  const originalCustom = (await pool.query("SELECT commission_rate_applied FROM bookings WHERE id=$1", [custom.id])).rows[0];
  assert.equal(Number(originalCustom.commission_rate_applied), 8);
  console.log("PASS: Vendor/global changes leave existing booking snapshots unchanged");
  assert.equal((await call("/api/admin/vendors/1/commission", "PATCH", defaultPlan, member)).status, 403);
  assert.equal((await call("/api/admin/vendors/1/commission", "PATCH", defaultPlan)).status, 401);
  assert.equal((await call("/api/admin/vendors/1/commission", "PATCH", defaultPlan, vendorCookie)).status, 403);
  for (const bad of [{ ...customPlan, introductoryRate: 101 }, { ...customPlan, introductoryMonths: 1.5 }, { ...customPlan, standardRate: -1 }, { ...customPlan, standardRate: 8.123 }]) {
    assert.equal((await call("/api/admin/vendors/1/commission", "PATCH", bad, admin)).status, 400);
  }
  assert.equal(commissionForVendor({ firstListingPublishedAt: null, commissionOverrideRate: 7 }, defaults).rate, 7);
  console.log("PASS: Admin guards, fee validation and legacy flat overrides retained");
  if (process.argv.includes("--screenshots")) {
    // Reset fixture-only settings for truthful screenshots, without changing production/public rows.
    await storage.updatePricingSettings(defaultPlan, 1);
    await storage.setVendorFeePlan(1, defaultPlan);
    await pool.query("UPDATE vendors SET first_listing_published_at=NULL WHERE id=1");
    await pool.query("DELETE FROM bookings WHERE experience_id=1");
    await pool.query("UPDATE experiences SET status='draft' WHERE vendor_id=1");
    for (const id of [3, 4]) {
      await pool.query("INSERT INTO users(id,email,password,full_name,role) VALUES($1,$2,'!pending','Pending vendor','customer')", [id + 2, `fee-pending-${id}@test.invalid`]);
      await pool.query("INSERT INTO vendors(id,owner_profile_id,business_name,verification_status,city) VALUES($1,$2,$3,'pending','Colombo')", [id, id + 2, `Pending fee review ${id}`]);
    }
    console.log(`FEE_FIXTURE_READY ${base} pid=${process.pid}`);
    await new Promise<void>(resolve => { process.once("SIGTERM", resolve); process.once("SIGINT", resolve); });
  }
} finally {
  if (listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await pool.end();
}

