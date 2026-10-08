import assert from "node:assert/strict";
import { discoveryParams, durationLabel, ideasHeading, nearestCity, sessionChip, sessionInstant, sriLankaToday, type Session } from "../client/src/lib/discovery";

const now = new Date("2026-10-08T08:30:00Z"); // 2 PM in Sri Lanka
const slot = (date: string, startTime: string, spotsLeft = 8): Session => ({
  slotId: 1, date, startTime, endTime: "23:00", spotsLeft,
});
assert.equal(sessionChip(slot("2026-10-08", "14:35"), now), "Starts in 35 min");
assert.equal(sessionChip(slot("2026-10-08", "16:00"), now), "Today 4 PM");
assert.equal(sessionChip(slot("2026-10-08", "19:30"), now), "Tonight 7:30 PM");
assert.equal(sessionChip(slot("2026-10-10", "10:00"), now), "Sat 10 AM");
assert.equal(sessionChip(slot("2026-10-08", "13:00"), now), null);
assert.equal(sessionChip(slot("2026-10-08", "19:30", 0), now), null);
assert.equal(sessionChip(null, now), null);
assert.equal(sriLankaToday(new Date("2026-10-08T23:30:00Z")), "2026-10-09");
assert.equal(new Date(sessionInstant(slot("2026-10-08", "19:30"))).toISOString(), "2026-10-08T14:00:00.000Z");
assert.equal(durationLabel(120), "2 hrs");
assert.equal(durationLabel(90), "1 hr 30 min");
assert.equal(durationLabel(45), "45 min");
assert.equal(ideasHeading(1, { group: "1", time: "tonight", city: "", date: "" }), "1 thing for 1 person tonight");
assert.equal(ideasHeading(4, { group: "6+", time: "weekend", city: "Colombo", date: "" }), "4 things for 6+ people this weekend in Colombo");
assert.equal(ideasHeading(2, { group: "3-5", time: "date", city: "Kandy", date: "2026-10-10" }), "2 things for 3–5 people on Sat 10 Oct in Kandy");
const choices = { group: "6+" as const, time: "date" as const, date: "2026-10-10", city: "Kandy" };
assert.equal(discoveryParams(choices).get("date"), "2026-10-10");
assert.equal(discoveryParams(choices).get("time"), null);
assert.equal(discoveryParams(choices, true).get("date"), null);
assert.equal(discoveryParams(choices, true).get("city"), "Kandy");
assert.equal(discoveryParams(choices, true).get("group"), "6+");
assert.equal(nearestCity(6.9271, 79.8612), "Colombo");
console.log("PASS: 21 pure session/time-zone, duration, heading, filter and nearest-city assertions");
