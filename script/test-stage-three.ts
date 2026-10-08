import assert from "node:assert/strict";
import type { AvailabilitySlot } from "../shared/schema";
import { GUEST_BOOKING_ENABLED, SUPPORT_EMAIL } from "../shared/catalog";
import { sessionDays, sessionBookable, sessionAvailability, sessionDayHeading } from "../client/src/lib/activity-sessions";
import { storage } from "../server/storage";

async function main() {
  const now = Date.parse("2026-10-08T08:30:00Z");
  const slot = (capacity: number, startTime = "19:00", status = "open"): AvailabilitySlot =>
    ({ id: 1, experienceId: 1, date: "2026-10-08", startTime, endTime: "20:00", status, capacity });
  assert.equal(sessionAvailability(slot(0)), "Full");
  assert.equal(sessionAvailability(slot(1)), "Almost full");
  assert.equal(sessionAvailability(slot(2)), "Almost full");
  assert.equal(sessionAvailability(slot(4)), "4 spots");
  assert.equal(sessionAvailability(slot(8)), "8 spots");
  assert.equal(sessionAvailability(slot(8, "19:00", "closed")), "Unavailable");
  assert.equal(sessionBookable(slot(2), 3, now), false);
  assert.equal(sessionBookable(slot(2), 2, now), true);
  assert.equal(sessionBookable(slot(8, "13:00"), 2, now), false);
  assert.equal(sessionBookable(slot(8, "19:00", "closed"), 2, now), false);
  assert.equal(sessionDays([slot(4, "20:00"), slot(4, "13:00"), slot(0, "19:00")], now)[0][1][0].capacity, 0);
  assert.equal(sessionDayHeading("2026-10-10"), "Sat 10 Oct");
  assert.equal(SUPPORT_EMAIL, "hello@freespirit.club");
  assert.equal(GUEST_BOOKING_ENABLED, false);

  // Stub ONLY the read builder in this isolated process. No SQL is executed.
  const instance = storage as unknown as { bookingSelect: () => any };
  const original = instance.bookingSelect;
  const rows = ["requested", "confirmed", "declined", "cancelled", "completed"].map((status, index) => ({
    booking: { id: index + 1, experienceId: 1, customerProfileId: 123, status },
    experienceTitle: "Test activity", experienceCategory: "sports", experienceImageUrl: null,
    experienceCity: "Colombo", experienceLocationText: "Test venue", experienceDuration: 60,
    vendorId: 1, vendorName: "Test vendor", vendorContactPhone: "+94700000000",
    vendorContactEmail: "vendor@example.invalid", customerName: "Must not leak",
    customerEmail: "customer@example.invalid", customerPhone: "Must not leak",
  }));
  instance.bookingSelect = () => ({ where: () => ({ orderBy: async () => rows }) });
  try {
    const results = await storage.getBookingsByCustomer(123);
    for (const result of results) {
      const confirmed = result.status === "confirmed";
      assert.equal(result.vendor.contactPhone, confirmed ? "+94700000000" : null);
      assert.equal(result.vendor.contactEmail, confirmed ? "vendor@example.invalid" : null);
      assert.equal(result.experience.city, confirmed ? "Colombo" : null);
      assert.equal(result.experience.locationText, confirmed ? "Test venue" : null);
      assert.equal(JSON.stringify(result).includes("Must not leak"), false);
      assert.equal(result.customer, undefined);
    }
  } finally { instance.bookingSelect = original; }
  console.log("PASS: session rules, guest/support settings, all five contact-release states and stripped customer contact");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
