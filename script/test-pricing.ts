/**
 * Integration tests against an isolated schema in DEVELOPMENT.
 * No public-table rows or production connections are written.
 * Run: NODE_ENV=development npx tsx script/test-pricing.ts
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { scryptSync } from "node:crypto";
import express from "express";
import path from "node:path";
import { commissionForVendor, calculatePricing } from "../shared/pricing";
import { isolatePricingPool } from "./isolated-pricing-db";

if (process.env.REPLIT_DEPLOYMENT || process.env.NODE_ENV === "production" || process.env.DB_TARGET === "prod") {
  throw new Error("Development-only test");
}

const { pool } = await import("../server/db");
const { storage } = await import("../server/storage");
const { registerRoutes } = await import("../server/routes");
const schema = `pricing_test_${Date.now()}`;
const passed: string[] = [];
const app = express();
app.use(express.json());
const server = createServer(app);
let listening = false;
const record = (name: string) => { passed.push(name); console.log(`PASS: ${name}`); };
const safeSchema = `"${schema}"`; // generated digits and fixed prefix, never external input
try {
  await pool.query(`CREATE SCHEMA ${safeSchema}`);
  isolatePricingPool(pool, schema);
  for (const table of ["users", "countries", "vendors", "vendor_documents", "experiences", "experience_images", "availability_slots", "bookings", "pricing_settings", "site_settings", "waiting_list", "favorites", "reviews"]) {
    await pool.query(`CREATE TABLE ${safeSchema}.${table} (LIKE public.${table} INCLUDING ALL)`);
    await pool.query(`CREATE SEQUENCE ${safeSchema}.${table}_fixture_seq START 1000`);
    await pool.query(`ALTER TABLE ${safeSchema}.${table} ALTER COLUMN id SET DEFAULT nextval('${schema}.${table}_fixture_seq')`);
  }
  assert.equal((await pool.query("SELECT current_schema() AS name")).rows[0].name, schema);
  await pool.query("INSERT INTO pricing_settings(id,usd_to_lkr_rate) VALUES (1,300)");
  await pool.query("INSERT INTO site_settings(id,show_demo_content,bookings_open) VALUES(1,true,true)");
  const password = "PricingTestOnly123";
  const salt = "pricing-integration-fixture";
  const hash = `${scryptSync(password, salt, 64).toString("hex")}.${salt}`;
  for (const [id, role, resident] of [[1, "admin", true], [2, "customer", true], [3, "customer", false], [4, "vendor", true]] as const) {
    await pool.query("INSERT INTO users(id,email,password,full_name,role,is_sri_lankan_resident) VALUES($1,$2,$3,$4,$5,$6)",
      [id, `pricing-${id}@test.invalid`, hash, `Pricing fixture ${id}`, role, resident]);
  }
  await pool.query("INSERT INTO vendors(id,owner_profile_id,business_name,verification_status) VALUES(1,4,'Pricing fixture vendor','approved')");
  await pool.query(`INSERT INTO experiences(id,vendor_id,category,title,status,price_amount,visitor_price_usd,capacity)
    VALUES(1,1,'sports','Pricing fixture','draft',2500,10,100)`);
  const future = new Date(Date.now() + 86400_000 * 2).toISOString().slice(0, 10);
  await pool.query(`INSERT INTO availability_slots(id,experience_id,date,start_time,end_time,capacity) VALUES(1,1,$1,'10:00','11:00',100)`, [future]);
  await storage.updateExperience(1, { status: "published" });
  const start = (await storage.getVendor(1))!.firstListingPublishedAt;
  assert.ok(start);
  await storage.updateExperience(1, { status: "draft" });
  await storage.updateExperience(1, { status: "published" });
  assert.equal((await storage.getVendor(1))!.firstListingPublishedAt?.toISOString(), start.toISOString());
  record("First publication timestamp is set once and survives republishing");

  await registerRoutes(server, app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  listening = true;
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const call = async (path: string, method = "GET", body?: unknown, cookie = "") => {
    const response = await fetch(base + path, { method, headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { Cookie: cookie } : {}),
    }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json();
    return { response, data };
  };
  const login = async (id: number) => {
    const { response } = await call("/api/auth/login", "POST", { email: `pricing-${id}@test.invalid`, password });
    assert.equal(response.status, 200);
    return response.headers.get("set-cookie")!.split(";")[0];
  };
  const admin = await login(1), member = await login(2), visitor = await login(3), vendor = await login(4);
  for (const cookie of ["", member, vendor]) {
    assert.equal((await call("/api/admin/pricing-settings", "GET", undefined, cookie)).response.status, cookie ? 403 : 401);
    assert.equal((await call("/api/admin/pricing-settings", "PATCH", { standardRate: 1 }, cookie)).response.status, cookie ? 403 : 401);
    assert.equal((await call("/api/admin/vendors/1/commission", "PATCH", { commissionOverrideRate: 1 }, cookie)).response.status, cookie ? 403 : 401);
  }
  record("Commission settings and override endpoints retain admin-only guards");
  assert.deepEqual((await call("/api/pricing-config")).data, { usdToLkrRate: 300 });
  record("Public pricing configuration exposes only the exchange rate");
  const bookingBody = { experienceId: 1, slotId: 1, qty: 4, residentCount: 2, visitorCount: 2 };
  const mixed = await call("/api/bookings", "POST", { ...bookingBody, totalAmount: 1, commissionRateApplied: 0 }, member);
  assert.equal(mixed.response.status, 200);
  assert.equal(mixed.data.totalAmount, 11000);
  assert.equal(mixed.data.currencyCode, "LKR");
  assert.equal(mixed.data.commissionRateApplied, "10.00");
  assert.equal(mixed.data.commissionAmountLkr, 1100);
  assert.equal(mixed.data.vendorNetAmountLkr, 9900);
  assert.equal(mixed.data.residentCount, 2);
  assert.equal(mixed.data.visitorCount, 2);
  assert.equal(mixed.data.lkrUnitPrice, 2500);
  assert.equal(mixed.data.usdUnitPrice, 10);
  assert.equal(Number(mixed.data.exchangeRateUsed), 300);
  record("Mixed booking totals LKR 11,000 with 10% introductory commission and full snapshots");
  record("Tampered browser total and commission are ignored and recalculated by the server");
  await call("/api/admin/pricing-settings", "PATCH", { introductoryRate: 12, standardRate: 18, usdToLkrRate: 320 }, admin);
  await storage.updateExperience(1, { priceAmount: 2700, visitorPriceUsd: 12 });
  const immutable = await storage.getBooking(mixed.data.id);
  assert.equal(immutable!.totalAmount, 11000);
  assert.equal(immutable!.commissionAmountLkr, 1100);
  assert.equal(immutable!.lkrUnitPrice, 2500);
  assert.equal(Number(immutable!.exchangeRateUsed), 300);
  record("Settings and listing price changes do not alter an existing booking snapshot");
  await call("/api/admin/pricing-settings", "PATCH", { introductoryRate: 10, standardRate: 15, usdToLkrRate: 300 }, admin);
  await storage.updateExperience(1, { priceAmount: 2500, visitorPriceUsd: 10 });
  await pool.query("UPDATE vendors SET first_listing_published_at=now()-interval '4 months' WHERE id=1");
  const standard = await call("/api/bookings", "POST", bookingBody, member);
  assert.equal(standard.data.commissionRateApplied, "15.00");
  record("Vendor after introductory period gets 15% standard commission");
  assert.equal((await call("/api/admin/vendors/1/commission", "PATCH", { commissionOverrideRate: 7.5 }, admin)).response.status, 200);
  const overridden = await call("/api/bookings", "POST", bookingBody, member);
  assert.equal(overridden.data.commissionRateApplied, "7.50");
  assert.equal(overridden.data.commissionAmountLkr, 825);
  record("Per-vendor 7.5% override applies to new bookings");
  const rateAudit = (await call("/api/admin/pricing-settings", "GET", undefined, admin)).data;
  assert.equal(rateAudit.exchangeRateUpdatedBy, 1);
  assert.ok(rateAudit.exchangeRateUpdatedAt);
  assert.equal(rateAudit.exchangeRateUpdatedByName, "Pricing fixture 1");
  record("Exchange-rate updates record the admin and timestamp");
  await call("/api/admin/pricing-settings", "PATCH", { usdToLkrRate: null }, admin);
  const before = (await pool.query("SELECT capacity FROM availability_slots WHERE id=1")).rows[0].capacity;
  const missingRate = await call("/api/bookings", "POST", { experienceId: 1, slotId: 1, qty: 1 }, visitor);
  assert.equal(missingRate.response.status, 400);
  assert.match(missingRate.data.message, /exchange rate/);
  assert.equal((await pool.query("SELECT capacity FROM availability_slots WHERE id=1")).rows[0].capacity, before);
  record("Visitor booking without an exchange rate is rejected without consuming spots");
  assert.equal((await call("/api/bookings", "POST", { ...bookingBody, residentCount: 1 }, member)).response.status, 400);
  assert.equal((await call("/api/admin/pricing-settings", "PATCH", { usdToLkrRate: -2 }, admin)).response.status, 400);
  assert.equal((await call("/api/admin/pricing-settings", "PATCH", { introductoryRate: 101 }, admin)).response.status, 400);
  assert.equal((await call("/api/admin/experiences/1", "PATCH", { visitorPriceUsd: 10.5 }, admin)).response.status, 400);
  record("Mismatched group counts, invalid settings and fractional USD prices are rejected");
  await storage.updateExperience(1, { visitorPriceUsd: null });
  const singleRate = await call("/api/bookings", "POST", { experienceId: 1, slotId: 1, qty: 2 }, visitor);
  assert.equal(singleRate.data.totalAmount, 5000);
  assert.equal(singleRate.data.visitorCount, 2);
  assert.equal(singleRate.data.residentCount, 0);
  assert.equal(singleRate.data.exchangeRateUsed, null);
  record("Listing without visitor pricing uses LKR for everyone and needs no exchange rate");
  assert.equal((await call("/api/auth/signup", "POST", { email: "new@test.invalid", fullName: "New fixture", password })).response.status, 400);
  assert.equal((await call("/api/auth/profile", "PATCH", { isSriLankanResident: false }, member)).data.isSriLankanResident, false);
  record("Signup requires residency status and Profile can edit it");
  const settings = { introductoryRate: 10, standardRate: 15, introductoryMonths: 3 };
  const vendorPolicy = { firstListingPublishedAt: "2026-01-31T12:00:00Z", commissionOverrideRate: null };
  assert.equal(commissionForVendor(vendorPolicy, settings, new Date("2026-04-30T11:59:59Z")).rate, 10);
  assert.equal(commissionForVendor(vendorPolicy, settings, new Date("2026-04-30T12:00:00Z")).rate, 15);
  assert.equal(calculatePricing({ residentCount: 0, visitorCount: 1, priceAmount: 0, visitorPriceUsd: 1, usdToLkrRate: 300.5 }).totalAmount, 301);
  record("Calendar-month boundary clamps correctly and fractional exchange rates round to whole LKR");
  console.log(`PASS: ${passed.length} pricing scenarios. All test fixtures were isolated from public tables.`);
  if (process.argv.includes("--screenshots")) {
    await pool.query("UPDATE vendors SET first_listing_published_at=now(), commission_override_rate=null WHERE id=1");
    await pool.query("UPDATE users SET is_sri_lankan_resident=true WHERE id=2");
    await pool.query("INSERT INTO countries(id,name,code,currency_code) VALUES(1,'Sri Lanka','LK','LKR')");
    await pool.query("UPDATE vendors SET city='Colombo', country_id=1 WHERE id=1");
    await storage.updateExperience(1, {
      title: "Futsal with friends", visitorPriceUsd: 10, priceAmount: 2500,
      imageUrl: "/images/category-sports-800.webp", city: "Colombo",
      durationMinutes: 120, description: "Get your group together for a friendly session on the futsal court.",
      locationText: "Colombo sports court", countryId: 1,
    });
    await storage.updatePricingSettings({ introductoryRate: 10, standardRate: 15, introductoryMonths: 3, usdToLkrRate: 300 }, 1);
    app.use(express.static(path.resolve("dist/public")));
    app.get("/{*path}", (_req, res) => { res.sendFile(path.resolve("dist/public/index.html")); });
    console.log(`SCREENSHOT_FIXTURE_READY http://127.0.0.1:${address.port} schema=${schema}`);
    await new Promise<void>(resolve => {
      process.once("SIGTERM", resolve);
      process.once("SIGINT", resolve);
    });
  }
} finally {
  if (listening) {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
  await pool.query(`DROP SCHEMA IF EXISTS ${safeSchema} CASCADE`);
  await pool.end();
}
