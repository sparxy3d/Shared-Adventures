import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import { sessionPlan } from "../server/vendor-session-plan";
import { addDays, colomboToday } from "../server/time";
import { storage } from "../server/storage";
import { pool } from "../server/db";
import { registerRoutes } from "../server/routes";
import { applicationDetails } from "../client/src/lib/vendor-listings";

const applicationText = "About the business\n\n— Application —\nWebsite or Instagram: @fixture\nVendor terms (draft v0 (8 Oct 2026)) accepted: 2026-10-08T09:00:00.000Z";
const details = applicationDetails(applicationText);
assert.equal(details.termsVersion, "draft v0 (8 Oct 2026)");
assert.equal(details.about, "About the business");
assert.equal(details.block, applicationText.slice(applicationText.indexOf("— Application —")));

const pattern = [6, 0].flatMap(weekday => ["10:00", "14:00"].map(startTime => ({ weekday, startTime, capacity: 12 })));
const planned = sessionPlan("2026-10-08", 60, [...pattern, pattern[0]], 90);
assert.equal(planned.length, 36);
assert.equal(new Set(planned.map(s => `${s.date}/${s.startTime}`)).size, 36);
assert.ok(planned.every(s => s.date > "2026-10-08" && s.date <= "2026-12-07" && s.capacity === 12));
assert.equal(planned[0].endTime, "11:30");
assert.equal(sessionPlan("2026-10-08", 1, [{ weekday: 5, startTime: "23:30", capacity: 12 }], 90)[0].endTime, "01:00");
console.log("PASS: SL tomorrow/60-day horizon, weekdays, deduplication and minute/midnight duration");

Object.defineProperty(pool, "query", { value: () => { throw Error("SQL prohibited in isolated fixtures"); } });
let status = "draft", generated = 0, updated = 0;
const today = colomboToday(), future = addDays(today, 2);
Object.defineProperty(storage, "getVendorByOwner", { value: async () => ({ id: 77, verificationStatus: "approved" }) });
Object.defineProperty(storage, "getExperience", { value: async (id: number) => ({
  id, vendorId: id === 99 ? 99 : 77, title: "Fixture", status, durationMinutes: 90, imageUrl: "/images/pottery.png",
}) });
Object.defineProperty(storage, "updateExperience", { value: async (_id: number, fields: {status?: string}) => {
  updated++; if (fields.status) status = fields.status; return { id: 55, ...fields };
} });
Object.defineProperty(storage, "getSlotsByExperience", { value: async () => [
  { date: future, startTime: "10:00", status: "open", capacity: 12 },
] });
Object.defineProperty(storage, "generateVendorSessions", { value: async (_id: number, plan: unknown[]) => { generated++; return plan.length; } });
Object.defineProperty(storage, "closeVendorDay", { value: async () => ({ removed: 1, kept: 1 }) });
Object.defineProperty(storage, "getSlot", { value: async (id: number) => ({ id, experienceId: id === 99 ? 99 : 55 }) });
Object.defineProperty(storage, "deleteVendorSession", { value: async (_id: number, slotId: number) => slotId === 98 ? "past" : "booked" });
const app = express(); app.use(express.json());
app.use((req, res, next) => {
  res.locals.user = { id: 7, fullName: "Fixture", email: "fixture@example.invalid", password: "!fixture", phone: null,
    role: req.header("x-fixture-role") || "vendor", createdAt: new Date() }; next();
});
const server = createServer(app); await registerRoutes(server, app);
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
const address = server.address(); assert.ok(address && typeof address !== "string");
async function call(method: string, path: string, body?: unknown, role = "vendor") {
  const result = await fetch(`http://127.0.0.1:${address!.port}${path}`, {
    method, headers: { "Content-Type": "application/json", "x-fixture-role": role },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: result.status, body: await result.json() };
}
try {
  const base = "/api/vendor/experiences/55";
  for (const suffix of ["", "/slots"]) assert.equal((await call("GET", "/api/vendor/experiences/99" + suffix)).status, 404);
  for (const suffix of ["generate-sessions", "close-day"]) assert.equal((await call("POST", `/api/vendor/experiences/99/${suffix}`, {})).status, 404);
  assert.equal((await call("DELETE", "/api/vendor/slots/99")).status, 404);
  assert.equal((await call("POST", base + "/generate-sessions", { pattern, days: 60 }, "customer")).status, 403);
  for (const invalid of [{ days: 61, pattern }, { days: 0, pattern }, { days: 60, pattern: [] },
    { days: 60, pattern: [{ weekday: 7, startTime: "10:00", capacity: 12 }] },
    { days: 60, pattern: [{ weekday: 0, startTime: "25:00", capacity: 12 }] },
    { days: 60, pattern: [{ weekday: 0, startTime: "10:00", capacity: 1.5 }] }])
    assert.equal((await call("POST", base + "/generate-sessions", invalid)).status, 400);
  assert.equal(generated, 0);
  assert.equal((await call("POST", base + "/generate-sessions", { pattern, days: 60 })).status, 200);
  assert.equal((await call("POST", base + "/close-day", { date: future, reason: "" })).status, 400);
  assert.equal((await call("POST", base + "/close-day", { date: addDays(today, -1), reason: "Weather" })).status, 400);
  assert.deepEqual((await call("POST", base + "/close-day", { date: future, reason: "Weather" })).body, { removed: 1, kept: 1, reason: "Weather" });
  assert.equal((await call("PATCH", base, { priceAmount: 25.5 })).status, 400);
  assert.equal((await call("PATCH", base, { title: "a".repeat(61) })).status, 400);
  assert.equal((await call("PATCH", base, { status: "unpublished" })).status, 400);
  assert.equal((await call("PATCH", base, { status: "published" })).status, 200);
  assert.equal((await call("PATCH", "/api/admin/experiences/55", { status: "unpublished" }, "admin")).status, 200);
  const before = updated;
  for (const status of ["draft", "published"]) {
    const rejected = await call("PATCH", base, { status });
    assert.equal(rejected.status, 403); assert.equal(rejected.body.message, "Unpublished by Free Spirit — contact us");
  }
  assert.equal(updated, before);
  assert.equal((await call("PATCH", base, { title: "Still editable" })).status, 200);
  assert.equal((await call("DELETE", "/api/vendor/slots/55")).status, 409);
  assert.equal((await call("DELETE", "/api/vendor/slots/98")).status, 409);
  console.log("PASS: ownership/roles/validation/admin-only unpublished, blocked changes and protected deletion");
} finally {
  await new Promise<void>(resolve => server.close(() => resolve())); await pool.end();
}
