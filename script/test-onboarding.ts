/**
 * Real handlers/auth/SQL with an isolated development schema.
 * Default object storage is a test adapter, NOT a live cloud bucket.
 * Add --real-storage only after configuring LISTING_PHOTOS_BUCKET_DEV.
 * Run: NODE_ENV=development npx tsx script/test-onboarding.ts [--screenshots]
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { scryptSync, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import express from "express";
import path from "node:path";
import sharp from "sharp";
import { isolatePricingPool } from "./isolated-pricing-db";
import type { PhotoObjects } from "../server/listing-photos";

if (process.env.REPLIT_DEPLOYMENT || process.env.NODE_ENV === "production" || process.env.DB_TARGET === "prod") throw new Error("Development only");
if (process.argv.includes("--real-storage") && !process.env.LISTING_PHOTOS_BUCKET_DEV?.trim()) {
  throw new Error("Real-storage onboarding tests require LISTING_PHOTOS_BUCKET_DEV; default and production buckets are never used");
}
const { pool } = await import("../server/db");
const { storage } = await import("../server/storage");
const { registerRoutes } = await import("../server/routes");
const { AppStoragePhotos } = await import("../server/listing-photos");
const schema = `pricing_test_${Date.now()}`;
const quoted = `"${schema}"`;
const app = express();
app.use(express.json());
const server = createServer(app);
const objects = new Map<string, Buffer>();
const cloud = process.argv.includes("--real-storage") ? new AppStoragePhotos() : null;
const objectStore: PhotoObjects = {
  put: async (key, value) => { objects.set(key, value); if (cloud) await cloud.put(key, value); },
  get: async key => { if (cloud) return cloud.get(key); const bytes = objects.get(key); if (!bytes) throw Error("Not found"); return bytes; },
  remove: async key => { if (cloud) await cloud.remove(key); objects.delete(key); },
};
const pass = (message: string) => console.log(`PASS: ${message}`);
const password = "OnboardingTest123";
let listening = false;
try {
  await pool.query(`CREATE SCHEMA ${quoted}`);
  isolatePricingPool(pool, schema);
  for (const table of ["users", "countries", "vendors", "vendor_documents", "experiences", "experience_images", "availability_slots", "bookings", "pricing_settings", "site_settings", "waiting_list", "favorites", "reviews"]) {
    await pool.query(`CREATE TABLE ${quoted}.${table} (LIKE public.${table} INCLUDING ALL)`);
    await pool.query(`CREATE SEQUENCE ${quoted}.${table}_fixture_seq START 1000`);
    await pool.query(`ALTER TABLE ${quoted}.${table} ALTER COLUMN id SET DEFAULT nextval('${schema}.${table}_fixture_seq')`);
  }
  const salt = "onboarding-only-fixture";
  const hash = `${scryptSync(password, salt, 64).toString("hex")}.${salt}`;
  for (const [id, role] of [[1, "admin"], [2, "vendor"], [3, "customer"], [4, "vendor"]] as const) {
    await pool.query("INSERT INTO users(id,email,password,full_name,role) VALUES($1,$2,$3,$4,$5)", [id, `onboarding-${id}@test.invalid`, hash, `Onboarding fixture ${id}`, role]);
  }
  await pool.query("INSERT INTO pricing_settings(id,usd_to_lkr_rate) VALUES(1,300)");
  await pool.query("INSERT INTO site_settings(id,show_demo_content,bookings_open) VALUES(1,true,false)");
  await pool.query("INSERT INTO vendors(id,owner_profile_id,business_name,verification_status,is_demo) VALUES(1,2,'Weekend Studio','approved',true),(2,4,'Second fixture vendor','approved',false)");
  await pool.query("INSERT INTO experiences(id,vendor_id,title,description,category,city,status,price_amount,capacity,duration_minutes,image_url,is_demo) VALUES(1,1,'Pottery with friends','A hosted workshop for your group','arts','Colombo','published',2500,12,120,'/images/pottery.png',true)");
  await pool.query("INSERT INTO availability_slots(id,experience_id,date,start_time,end_time,capacity) VALUES(1,1,to_char(current_date+2,'YYYY-MM-DD'),'10:00','12:00',12)");
  await pool.query("INSERT INTO favorites(customer_profile_id,experience_id) VALUES(3,1)");
  await registerRoutes(server, app, { photoObjects: objectStore });
  app.use((error: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(error.status ?? 500).json({ message: error.message }));
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve)); listening = true;
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const call = async (url: string, method = "GET", body?: unknown, cookie = "") => {
    const response = await fetch(base + url, { method, headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json(), response };
  };
  const loginEmail = async (email: string, pw = password) => {
    const result = await call("/api/auth/login", "POST", { email, password: pw });
    assert.equal(result.status, 200);
    return { cookie: result.response.headers.get("set-cookie")!.split(";")[0], user: result.data };
  };
  const admin = (await loginEmail("onboarding-1@test.invalid")).cookie;
  const vendor = (await loginEmail("onboarding-2@test.invalid")).cookie;
  const member = (await loginEmail("onboarding-3@test.invalid")).cookie;
  const other = (await loginEmail("onboarding-4@test.invalid")).cookie;
  const body = { experienceId: 1, slotId: 1, qty: 2 };
  assert.equal((await call("/api/bookings", "POST", body, member)).status, 403);
  assert.equal((await storage.getUpcomingSlots(1))[0].capacity, 12);
  pass("Closed bookings rejected by server without consuming inventory; discovery still works");
  assert.equal((await call("/api/experiences")).data.length, 1);
  assert.equal((await call("/api/experiences/1/notify", "POST", { email: " Awaiting@EXAMPLE.COM ", name: "=SUM(1)" })).status, 200);
  assert.equal((await call("/api/experiences/1/notify", "POST", { email: "awaiting@example.com" })).status, 200);
  assert.equal((await call("/api/admin/waiting-list", "GET", undefined, admin)).data.entries.length, 1);
  for (const cookie of ["", member, vendor]) assert.equal((await call("/api/admin/waiting-list", "GET", undefined, cookie)).status, cookie ? 403 : 401);
  const csv = await fetch(base + "/api/admin/waiting-list/export", { headers: { Cookie: admin } });
  assert.ok((await csv.text()).includes("\"'=SUM(1)\""));
  pass("Waiting list deduplicates normalized email/listing; admin-only list and formula-safe CSV");
  await call("/api/admin/site-settings", "PATCH", { showDemoContent: false, bookingsOpen: true }, admin);
  for (const url of ["/api/experiences/1", "/api/experiences/1/slots", "/api/experiences/1/photos", "/api/experiences/surprise"]) assert.equal((await call(url)).status, 404);
  for (const suffix of ["", "?time=now", "?time=tonight", "?time=weekend", "?category=arts", "/featured"]) assert.equal((await call("/api/experiences" + suffix)).data.length, 0);
  assert.equal((await call("/api/bookings", "POST", body, member)).status, 404);
  assert.equal((await call("/api/favorites", "GET", undefined, member)).data.length, 0);
  assert.equal((await call("/api/admin/experiences", "GET", undefined, admin)).data[0].isDemo, true);
  pass("Demo off hides listing, slots, photos, all discovery windows and Surprise; booking refused; admin still sees Demo");
  for (const cookie of ["", member, vendor]) assert.equal((await call("/api/admin/site-settings", "PATCH", { bookingsOpen: true }, cookie)).status, cookie ? 403 : 401);
  await call("/api/admin/site-settings", "PATCH", { showDemoContent: true, bookingsOpen: true }, admin);
  assert.equal((await call("/api/bookings", "POST", body, member)).status, 200);
  pass("Admin-only switches; enabling bookings restores normal request flow");
  const reset = await call("/api/admin/members/3/reset-password", "POST", {}, admin);
  const temporary = reset.data.temporaryPassword as string;
  const flagged = await loginEmail("onboarding-3@test.invalid", temporary);
  assert.equal(flagged.user.mustChangePassword, true);
  for (const url of ["/api/auth/me", "/api/site-config", "/api/experiences", "/api/bookings", "/api/admin/members", "/api/vendor/dashboard"]) {
    const result = await call(url, "GET", undefined, flagged.cookie);
    assert.equal(result.status, 403); assert.equal(result.data.code, "PASSWORD_CHANGE_REQUIRED");
  }
  assert.equal((await call("/api/bookings", "POST", body, flagged.cookie)).data.code, "PASSWORD_CHANGE_REQUIRED");
  assert.equal((await call("/api/auth/change-password", "POST", { currentPassword: temporary, newPassword: temporary }, flagged.cookie)).status, 400);
  assert.equal((await call("/api/auth/change-password", "POST", { currentPassword: temporary, newPassword: "short" }, flagged.cookie)).status, 400);
  assert.equal((await call("/api/auth/change-password", "POST", { currentPassword: temporary, newPassword: "ChangedForTest123" }, flagged.cookie)).status, 200);
  assert.equal((await call("/api/auth/me", "GET", undefined, flagged.cookie)).data.mustChangePassword, false);
  await loginEmail("onboarding-3@test.invalid", "ChangedForTest123");
  pass("Temporary-password session cannot call any other API; same/short passwords refused; change clears flag and new login works");
  const created = await call("/api/admin/members", "POST", { email: "created-admin@test.invalid", fullName: "Created admin", role: "admin" }, admin);
  assert.equal(created.data.user.mustChangePassword, true);
  const adminTemp = await loginEmail(created.data.login.email, created.data.login.temporaryPassword);
  assert.equal((await call("/api/admin/site-settings", "GET", undefined, adminTemp.cookie)).data.code, "PASSWORD_CHANGE_REQUIRED");
  assert.equal((await call("/api/auth/logout", "POST", {}, adminTemp.cookie)).status, 200);
  const newVendor = await call("/api/admin/vendors", "POST", { businessName: "New real vendor", contactName: "Owner", contactEmail: "new-vendor@test.invalid" }, admin);
  assert.equal(newVendor.status, 200);
  const vendorTemp = await loginEmail(newVendor.data.login.email, newVendor.data.login.temporaryPassword);
  assert.equal(vendorTemp.user.mustChangePassword, true);
  assert.equal(newVendor.data.vendor.isDemo, false);
  await pool.query("INSERT INTO users(id,email,password,full_name) VALUES(10,'applicant@test.invalid','!placeholder','Applicant')");
  await pool.query("INSERT INTO vendors(id,owner_profile_id,business_name,verification_status) VALUES(10,10,'Pending applicant','pending')");
  const approved = await call("/api/admin/vendors/10/approve", "POST", {}, admin);
  const applicant = await loginEmail(approved.data.login.email, approved.data.login.temporaryPassword);
  assert.equal(applicant.user.mustChangePassword, true);
  pass("Admin-created admin/vendor and application approval all issue flagged temporary logins; logout remains available");
  const upload = async (bytes: Buffer, name = "photo.jpg", cookie = vendor) => {
    const form = new FormData(); form.append("photos", new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }), name);
    const response = await fetch(base + "/api/vendor/experiences/1/photos", { method: "POST", headers: { Cookie: cookie }, body: form });
    return { status: response.status, data: await response.json() };
  };
  assert.equal((await upload(Buffer.from("not a photo"), "disguised.jpg")).status, 400);
  const oversizedImage = await sharp(randomBytes(2000 * 1834 * 3), { raw: { width: 2000, height: 1834, channels: 3 } }).png({ compressionLevel: 0 }).toBuffer();
  assert.ok(oversizedImage.length > 11_000_000);
  assert.equal((await upload(oversizedImage, "large.png")).status, 400);
  assert.equal((await upload(Buffer.from("x"), "x.jpg", other)).status, 404);
  const photo = await sharp(await readFile("client/public/images/pottery.png")).resize(1800, 1200).jpeg()
    .withExif({ IFD0: { Make: "Test camera", Model: "Private metadata" } }).toBuffer();
  const uploaded = await upload(photo);
  assert.equal(uploaded.status, 200);
  const uploadedPhoto = uploaded.data.find((row: { storageKey: string | null }) => row.storageKey);
  assert.ok(uploadedPhoto);
  for (const width of [1600, 800, 400]) {
    const bytes = objects.get(`${uploadedPhoto.storageKey}/${width}.webp`)!;
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.format, "webp"); assert.equal(meta.width, width); assert.equal(meta.exif, undefined); assert.equal(meta.xmp, undefined); assert.equal(meta.icc, undefined);
  }
  pass("Renamed non-image and 11MB image rejected; valid photo resized to three WebPs with metadata removed");
  const ids = uploaded.data.map((row: { id: number }) => row.id).reverse();
  assert.equal((await call("/api/vendor/experiences/1/photos", "PUT", { photoIds: [uploadedPhoto.id, uploadedPhoto.id] }, vendor)).status, 400);
  const tooMany = new FormData();
  for (let i = 0; i < 6; i++) tooMany.append("photos", new Blob([new Uint8Array(photo)]), `photo-${i}.jpg`);
  const capped = await fetch(base + "/api/admin/experiences/1/photos", { method: "POST", headers: { Cookie: admin }, body: tooMany });
  assert.equal(capped.status, 400);
  const ordered = await call("/api/vendor/experiences/1/photos", "PUT", { photoIds: ids }, vendor);
  assert.equal(ordered.data[0].id, uploadedPhoto.id);
  const saved = await call("/api/vendor/experiences/1", "PATCH", { title: "Pottery with friends", imageUrl: uploadedPhoto.imageUrl }, vendor);
  assert.equal(saved.status, 200);
  assert.equal(saved.data.imageUrl, uploadedPhoto.imageUrl);
  const publicExp = await call("/api/experiences/1");
  assert.equal(publicExp.data.imageUrl, uploadedPhoto.imageUrl);
  assert.ok(publicExp.data.photoSrcSet.includes("400w"));
  const imageResponse = await fetch(base + uploadedPhoto.imageUrl);
  assert.equal(imageResponse.status, 200); assert.equal(imageResponse.headers.get("content-type"), "image/webp");
  const copied = await call("/api/vendor/experiences/1/duplicate", "POST", {}, vendor);
  assert.equal(copied.status, 200);
  assert.equal(copied.data.status, "draft");
  assert.equal(copied.data.isDemo, false);
  const copiedPhotos = await storage.getListingPhotos(copied.data.id);
  const copiedUpload = copiedPhotos.find(row => !!row.storageKey)!;
  assert.ok(copiedUpload);
  assert.notEqual(copiedUpload.storageKey, uploadedPhoto.storageKey);
  assert.equal((await call(`/api/vendor/experiences/1/photos/${uploadedPhoto.id}`, "DELETE", undefined, vendor)).status, 200);
  assert.equal(objects.size, 3);
  assert.equal((await call(`/api/vendor/experiences/${copied.data.id}/photos/${copiedUpload.id}`, "DELETE", undefined, vendor)).status, 200);
  assert.equal(objects.size, 0);
  pass("Photo ownership, order/cover, responsive public image API and deletion of all stored variants");
  // Leave representative fixture state for screenshots, never public database tables.
  await upload(photo);
  await call("/api/admin/site-settings", "PATCH", { bookingsOpen: false }, admin);
  await pool.query("INSERT INTO users(id,email,password,full_name,role,must_change_password) VALUES(20,'temporary@test.invalid',$1,'Temporary vendor','vendor',true)", [hash]);
  await pool.query("UPDATE site_settings SET show_demo_content=true WHERE id=1");
  if (process.argv.includes("--screenshots")) {
    app.use(express.static(path.resolve("dist/public")));
    app.get("/{*splat}", (_req, res) => res.sendFile(path.resolve("dist/public/index.html")));
    console.log(`SCREENSHOT_FIXTURE_READY ${base} schema=${schema}`);
    await new Promise<void>(resolve => { process.once("SIGTERM", resolve); process.once("SIGINT", resolve); });
  }
  pass(cloud ? "All onboarding checks passed with real object storage in the DEV bucket only" : "All onboarding checks passed (test-only object adapter, cloud bucket not verified)");
} finally {
  if (listening) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  if (cloud) {
    const keys = Array.from(objects.keys());
    const results = await Promise.allSettled(keys.map(key => cloud.remove(key)));
    const remaining = keys.filter((_key, index) => results[index].status === "rejected");
    if (remaining.length) console.error("Cloud test files still need cleanup:", JSON.stringify(remaining));
  }
  await pool.query(`DROP SCHEMA IF EXISTS ${quoted} CASCADE`);
  await pool.end();
}
