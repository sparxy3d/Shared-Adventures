import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import { storage } from "../server/storage";
import { pool } from "../server/db";
import { registerRoutes } from "../server/routes";
import { adminInsights, approvalDate, withApprovalDate } from "../server/admin-insights";
import { addDays, colomboToday } from "../server/time";

const now = new Date("2026-10-08T12:00:00Z");
const stamp = withApprovalDate("About\n\n— Application —\nContact: Fixture", now);
assert.equal(approvalDate(stamp), now.toISOString());
assert.equal(withApprovalDate(stamp, new Date("2026-10-09T12:00:00Z")), stamp);
assert.equal(approvalDate("About only"), null);
const metricData = {
  vendors: [
    { id: 1, verificationStatus: "approved", publishedCount: 1, approvedAt: null },
    { id: 2, verificationStatus: "approved", publishedCount: 0, approvedAt: "2026-09-01T12:00:00Z" },
    { id: 3, verificationStatus: "approved", publishedCount: 0, approvedAt: null },
    { id: 4, verificationStatus: "contacted", publishedCount: 0, approvedAt: null },
  ],
  listings: [{ id: 1, status: "published" }, { id: 2, status: "published" }],
  bookings: [
    { id: 1, status: "requested", createdAt: new Date("2026-10-06T12:00:00Z"), bookingDate: "2026-10-08" },
    { id: 2, status: "requested", createdAt: new Date("2026-10-08T11:00:00Z"), bookingDate: "2026-10-08" },
  ],
  members: [{ role: "customer", hasLogin: false }, { role: "customer", hasLogin: true },
    { role: "disabled:customer", hasLogin: true }, { role: "vendor", hasLogin: true }],
  scheduled: [{ experienceId: 1 }],
} as unknown as Parameters<typeof adminInsights>[0];
const metrics = adminInsights(metricData, now);
assert.equal(metrics.members, 2);
assert.equal(metrics.unansweredOver24h, 1);
assert.equal(metrics.liveVendors, 1);
assert.deepEqual(metrics.attention.vendors.map(v => v.id), [2]);
assert.deepEqual(metrics.attention.listings.map(e => e.id), [2]);
assert.equal(metrics.weekStart, "2026-10-05");
assert.equal(metrics.weekEnd, "2026-10-11");
console.log("PASS: real-member counts, age thresholds, unknown approval exclusion, Monday week and metadata preservation");

Object.defineProperty(pool, "query", { value: () => { throw Error("SQL forbidden in isolated tests"); } });
const fixtureUser = { id: 7, role: "admin", email: "fixture@example.invalid", password: "!fixture", fullName: "Fixture", phone: null, createdAt: now };
let bookingStatus = "requested", note = "", released = 0;
Object.defineProperty(storage, "getUser", { value: async (id: number) => ({ ...fixtureUser, id, role: "customer" }) });
Object.defineProperty(storage, "getVendorByOwner", { value: async () => undefined });
Object.defineProperty(storage, "getVendor", { value: async (id: number) => id === 99 ? undefined : ({ id, verificationStatus: "pending" }) });
Object.defineProperty(storage, "markVendorContacted", { value: async () => ({ id: 1, verificationStatus: "contacted" }) });
Object.defineProperty(storage, "getExperience", { value: async (id: number) => id === 99 ? undefined : ({ id, vendorId: 1, durationMinutes: 90 }) });
Object.defineProperty(storage, "generateVendorSessions", { value: async (_id: number, plan: unknown[]) => plan.length });
Object.defineProperty(storage, "closeVendorDay", { value: async () => ({ removed: 1, kept: 1 }) });
Object.defineProperty(storage, "getBooking", { value: async () => ({ id: 1, status: bookingStatus, slotId: 1, qty: 2 }) });
Object.defineProperty(storage, "updateBooking", { value: async (_id: number, data: { status: string; vendorNote: string }) => {
  bookingStatus = data.status; note = data.vendorNote; return { id: 1, ...data };
} });
Object.defineProperty(storage, "releaseSpots", { value: async (_id: number, qty: number) => {
  assert.equal(qty, 2); released++;
} });
const app = express(); app.use(express.json());
app.use((req, res, next) => {
  res.locals.user = { ...fixtureUser, role: req.header("x-role") || "admin" }; next();
});
const server = createServer(app); await registerRoutes(server, app);
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
const address = server.address(); assert.ok(address && typeof address !== "string");
async function call(method: string, path: string, body?: unknown, role = "admin") {
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, { method,
    headers: { "content-type": "application/json", "x-role": role },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
try {
  for (const role of ["customer", "vendor", "disabled:admin"]) {
    for (const [method, path, data] of [
      ["GET", "/api/admin/members", undefined],
      ["POST", "/api/admin/experiences/1/generate-sessions", {}],
      ["POST", "/api/admin/experiences/1/close-day", {}],
    ] as const) assert.equal((await call(method, path, data, role)).status, 403);
  }
  assert.equal((await call("GET", "/api/admin/vendors/not-a-number")).status, 400);
  assert.equal((await call("POST", "/api/admin/vendors/99/contacted", {})).status, 404);
  assert.equal((await call("POST", "/api/admin/vendors/1/contacted", { role: "admin" })).status, 400);
  assert.equal((await call("POST", "/api/admin/vendors/1/contacted", {})).body.verificationStatus, "contacted");
  assert.equal((await call("PATCH", "/api/admin/members/7/role", { role: "admin" })).status, 400);
  assert.equal((await call("POST", "/api/admin/members/7/disable", {})).status, 400);
  const promote = await call("PATCH", "/api/admin/members/8/role", { role: "vendor" });
  assert.equal(promote.status, 400);
  assert.equal(promote.body.message, "Approve their application or create the vendor from Vendors");
  const base = "/api/admin/experiences/1";
  const pattern = [{ weekday: 6, startTime: "10:00", capacity: 12 }];
  assert.equal((await call("POST", base + "/generate-sessions", { days: 61, pattern })).status, 400);
  assert.equal((await call("POST", "/api/admin/experiences/99/generate-sessions", { days: 60, pattern })).status, 404);
  assert.equal((await call("POST", base + "/generate-sessions", { days: 60, pattern })).status, 200);
  assert.equal((await call("POST", base + "/close-day", { date: addDays(colomboToday(), 1), reason: "" })).status, 400);
  assert.deepEqual((await call("POST", base + "/close-day", { date: addDays(colomboToday(), 1), reason: "Weather" })).body,
    { removed: 1, kept: 1, reason: "Weather" });
  assert.equal((await call("PATCH", "/api/admin/bookings/1", { status: "declined" })).status, 400);
  assert.equal((await call("PATCH", "/api/admin/bookings/1", { status: "declined", declineReason: "Session is full", vendorNote: "Sorry" })).status, 200);
  assert.equal(note, "By Free Spirit: Session is full — Sorry");
  assert.equal(released, 1);
  assert.equal((await call("PATCH", "/api/admin/bookings/1", { status: "cancelled" })).status, 409);
  bookingStatus = "requested";
  assert.equal((await call("PATCH", "/api/admin/bookings/1", { status: "confirmed" })).status, 200);
  assert.equal(note, "By Free Spirit: Booking confirmed");
  assert.equal((await call("PATCH", "/api/admin/bookings/1", { status: "cancelled" })).status, 200);
  assert.equal(released, 2);
  console.log("PASS: admin guards, ID/body validation, self-protection, vendor-role refusal, safe session delegation, attributed notes and releases");
} finally {
  await new Promise<void>(resolve => server.close(() => resolve())); await pool.end();
}
