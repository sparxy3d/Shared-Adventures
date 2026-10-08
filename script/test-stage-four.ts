// Isolated route/projection fixtures. No seed import and no database queries.
import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import { storage } from "../server/storage";
import { registerRoutes } from "../server/routes";
import { pool } from "../server/db";
import { formatVendorDate, formatVendorTime, receivedTime, vendorBookingIsPast } from "../client/src/lib/vendor-bookings";

const base = {
  id: 1, experienceId: 55, slotId: 10, customerProfileId: 3, bookingDate: "2026-10-10",
  startTime: "19:00", endTime: "20:00", qty: 2, totalAmount: 5000,
  currencyCode: "LKR", status: "requested", customerNote: null, vendorNote: null,
  createdAt: new Date(),
};
assert.equal(receivedTime(null), "Time unavailable");
const now = Date.parse("2026-10-08T10:00:00Z"); // 3:30 PM Sri Lanka.
assert.equal(vendorBookingIsPast({ bookingDate: "2026-10-08", startTime: "15:00" }, now), true);
assert.equal(vendorBookingIsPast({ bookingDate: "2026-10-08", startTime: "16:00" }, now), false);
const row = {
  booking: base, experienceTitle: "Fixture activity", experienceCategory: "sports",
  experienceImageUrl: null, experienceCity: "Colombo", experienceDuration: 60,
  vendorId: 77, vendorName: "Fixture vendor", customerName: "Fixture member",
  customerEmail: "member@example.invalid", customerPhone: "+94770000000",
};
Object.defineProperty(storage, "bookingSelect", {
  value: () => ({ where: () => ({ orderBy: async () => [row] }) }),
});
Object.defineProperty(storage, "getSlotsByVendor", {
  value: async (vendorId: number) => { assert.equal(vendorId, 77); return [{ id: 10, capacity: 5 }]; },
});
for (const status of ["requested", "confirmed", "declined", "cancelled", "completed"]) {
  row.booking.status = status;
  const [result] = await storage.getBookingsByVendor(77);
  assert.equal(result.customer.email, status === "confirmed" ? row.customerEmail : null);
  assert.equal(result.customer.phone, status === "confirmed" ? row.customerPhone : null);
  assert.equal(result.spotsLeft, 5);
}
assert.equal(formatVendorTime("14:00"), "2:00 PM");
assert.ok(formatVendorDate("2026-10-10").includes("Oct"));
console.log("PASS: all-status vendor phone/email projection, remaining inventory and human time/date");

// Fail explicitly if session infrastructure unexpectedly attempts SQL in this fixture.
Object.defineProperty(pool, "query", { value: () => { throw new Error("SQL prohibited in isolated fixture"); } });
let releases = 0, updates = 0;
const current = { ...base, status: "requested" };
Object.defineProperty(storage, "getVendorByOwner", {
  value: async () => ({ id: 77, businessName: "Fixture vendor", verificationStatus: "approved" }),
});
Object.defineProperty(storage, "getBooking", { value: async (id: number) => ({ ...current, id, experienceId: id === 99 ? 99 : 55 }) });
Object.defineProperty(storage, "getExperience", { value: async (id: number) => ({ id, vendorId: id === 99 ? 99 : 77 }) });
Object.defineProperty(storage, "updateBooking", {
  value: async (_id: number, fields: Partial<typeof current>) => { updates++; Object.assign(current, fields); return current; },
});
Object.defineProperty(storage, "releaseSpots", { value: async (_id: number, qty: number) => { releases += qty; } });
const app = express();
app.use(express.json());
// Server-side identity fixture, never installed in the application.
app.use((req, res, next) => {
  res.locals.user = {
    id: 7, fullName: "Fixture owner", email: "owner@example.invalid", password: "!fixture",
    phone: null, role: req.header("x-fixture-role") || "vendor", createdAt: new Date(),
  };
  next();
});
const server = createServer(app);
await registerRoutes(server, app);
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address !== "string");
async function update(body: unknown, id = 1, role = "vendor") {
  const response = await fetch(`http://127.0.0.1:${address!.port}/api/vendor/bookings/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", "x-fixture-role": role },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
try {
  assert.equal((await update({ status: "confirmed" }, 99)).status, 404);
  assert.equal(updates, 0); assert.equal(releases, 0);
  assert.equal((await update({ status: "confirmed" }, 1, "customer")).status, 403);
  assert.equal((await update({ status: "confirmed" }, 1, "admin")).status, 403);
  assert.equal((await update({ status: "declined" })).status, 400);
  assert.equal((await update({ status: "declined", declineReason: "Invented reason" })).status, 400);
  assert.equal((await update({ status: "cancelled" })).status, 409);
  assert.equal((await update({ status: "confirmed" })).status, 200);
  assert.equal(releases, 0);
  assert.equal((await update({ status: "cancelled" })).status, 200);
  assert.equal(releases, 2);
  assert.equal((await update({ status: "cancelled" })).status, 409);
  assert.equal(releases, 2);
  current.status = "requested";
  const declined = await update({ status: "declined", declineReason: "Session is full", vendorNote: "sorry, fully booked" });
  assert.equal(declined.status, 200);
  assert.equal(declined.body.vendorNote, "Session is full — sorry, fully booked");
  assert.equal(releases, 4);
  console.log("PASS: isolated cross-vendor ownership, role/validation and legal transitions/release-once/note");
} finally {
  await new Promise<void>(resolve => server.close(() => resolve()));
  await pool.end();
}
