import type { Experience, Vendor } from "@shared/schema";
import type { DatabaseStorage } from "./storage";
import { addDays, colomboDayOfWeek, colomboToday } from "./time";

export function approvalDate(description: string | null): string | null {
  const value = description?.match(/^Approved at: ([^\r\n]+)$/m)?.[1];
  return value && Number.isFinite(Date.parse(value)) ? value : null;
}

export function withApprovalDate(description: string | null, now = new Date()): string {
  if (approvalDate(description)) return description!;
  const text = description ?? "";
  return `${text}${/^— Application —$/m.test(text) ? "" : "\n\n— Application —"}\nApproved at: ${now.toISOString()}`.trim();
}

type AdminBooking = Awaited<ReturnType<DatabaseStorage["getAllBookings"]>>[number];
type AdminVendor = Vendor & { publishedCount: number; approvedAt: string | null };

export function adminInsights(data: {
  vendors: AdminVendor[];
  listings: Experience[];
  bookings: AdminBooking[];
  members: Array<{ role: string; hasLogin: boolean }>;
  scheduled: Array<{ experienceId: number }>;
}, now = new Date()) {
  const today = colomboToday(now);
  const weekStart = addDays(today, -((colomboDayOfWeek(now) + 6) % 7));
  const weekEnd = addDays(weekStart, 6);
  const requests = data.bookings.filter(b => b.status === "requested" && b.createdAt &&
    now.getTime() - new Date(b.createdAt).getTime() > 24 * 60 * 60 * 1000);
  const vendors = data.vendors.filter(v => v.verificationStatus === "approved" && v.publishedCount === 0 &&
    v.approvedAt && now.getTime() - Date.parse(v.approvedAt) > 7 * 24 * 60 * 60 * 1000);
  const scheduledIds = new Set(data.scheduled.map(s => s.experienceId));
  const listings = data.listings.filter(e => e.status === "published" && !scheduledIds.has(e.id));
  return {
    liveVendors: data.vendors.filter(v => v.verificationStatus === "approved" && v.publishedCount > 0).length,
    pendingApplications: data.vendors.filter(v => ["pending", "contacted"].includes(v.verificationStatus)).length,
    publishedListings: data.listings.filter(e => e.status === "published").length,
    totalListings: data.listings.length,
    members: data.members.filter(u => u.hasLogin && u.role.replace(/^disabled:/, "") === "customer").length,
    bookingsThisWeek: data.bookings.filter(b => b.bookingDate >= weekStart && b.bookingDate <= weekEnd &&
      ["requested", "confirmed"].includes(b.status)).length,
    unansweredRequests: data.bookings.filter(b => b.status === "requested").length,
    unansweredOver24h: requests.length,
    weekStart, weekEnd,
    attention: { requests, vendors, listings },
  };
}
