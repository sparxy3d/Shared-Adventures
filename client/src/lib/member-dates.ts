import { formatTime12h } from "./dates";

export function bookingInstant(date: string, time: string | null) {
  return new Date(`${date}T${time || "00:00"}:00+05:30`).getTime();
}
export function memberBookingDate(date: string, time: string | null) {
  const instant = new Date(bookingInstant(date, time));
  if (!Number.isFinite(instant.getTime())) return "Date to be confirmed";
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Colombo", weekday: "short", day: "numeric", month: "short" }).format(instant).replace(",", "");
  return `${day}${time ? ` · ${formatTime12h(time)}` : ""}`;
}
