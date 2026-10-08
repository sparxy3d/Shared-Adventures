import type { BookingStatus } from "@shared/catalog";

export interface VendorBooking {
  id: number;
  experienceId: number;
  slotId?: number | null;
  bookingDate: string;
  startTime: string | null;
  endTime?: string | null;
  qty: number;
  totalAmount: number | null;
  currencyCode: string | null;
  status: BookingStatus | string;
  customerNote: string | null;
  vendorNote: string | null;
  createdAt: string | null;
  spotsLeft?: number | null;
  experience: { id?: number; title: string };
  customer: { fullName: string; email: string | null; phone?: string | null };
}

export function formatVendorDate(date: string, options: Intl.DateTimeFormatOptions = {}) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo", weekday: "short", day: "numeric", month: "short",
    ...options,
  }).format(new Date(Date.UTC(year, month - 1, day, 12))).replace(/,/g, "");
}

export function formatVendorTime(time?: string | null) {
  if (!time) return "Time to be confirmed";
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  const value = new Date(Date.UTC(2020, 0, 1, h, m));
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit", hour12: true }).format(value);
}

export function vendorBookingIsPast(booking: Pick<VendorBooking, "bookingDate" | "startTime">, now = Date.now()) {
  const day = booking.bookingDate.slice(0, 10);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(new Date(now));
  if (!booking.startTime) return day < today;
  const instant = Date.parse(`${day}T${booking.startTime.slice(0, 5)}:00+05:30`);
  return Number.isNaN(instant) ? day < today : instant < now;
}

export function receivedTime(date: string | null) {
  if (!date) return "Time unavailable";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en-LK", {
    timeZone: "Asia/Colombo", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  }).format(value);
}
