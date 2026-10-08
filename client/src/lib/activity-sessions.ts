import type { AvailabilitySlot } from "@shared/schema";
import { bookingInstant } from "./member-dates";

export function sessionIsFuture(slot: AvailabilitySlot, now = Date.now()) {
  return bookingInstant(slot.date, slot.startTime.slice(0, 5)) > now;
}
export function sessionBookable(slot: AvailabilitySlot, qty: number, now = Date.now()) {
  return slot.status === "open" && slot.capacity >= qty && sessionIsFuture(slot, now);
}
export function sessionDays(slots: AvailabilitySlot[], now = Date.now()) {
  const groups = new Map<string, AvailabilitySlot[]>();
  [...slots].filter(slot => sessionIsFuture(slot, now))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .forEach(slot => groups.set(slot.date, [...(groups.get(slot.date) || []), slot]));
  return Array.from(groups.entries());
}
export function sessionAvailability(slot: AvailabilitySlot) {
  if (slot.capacity <= 0) return "Full";
  if (slot.status !== "open") return "Unavailable";
  if (slot.capacity <= 2) return "Almost full";
  return `${slot.capacity} spots`;
}
export function sessionDayHeading(date: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Colombo", weekday: "short", day: "numeric", month: "short" })
    .format(new Date(`${date}T12:00:00+05:30`)).replace(",", "");
}
