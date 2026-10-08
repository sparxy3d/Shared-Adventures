// Fixed reference lists shared by server validation and client pickers.

export const CATEGORIES = [
  { value: "sports", label: "Sports" },
  { value: "adventure", label: "Adventure" },
  { value: "arts", label: "Arts & Classes" },
  { value: "wellness", label: "Wellness" },
  { value: "recreation", label: "Recreation" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];
export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value) as [CategoryValue, ...CategoryValue[]];

export function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

// Photos that exist in client/public/images. Listings may only point at these.
export const EXPERIENCE_IMAGES = [
  "/images/arcade.png",
  "/images/billiards.png",
  "/images/cooking.png",
  "/images/darts.png",
  "/images/golf.png",
  "/images/pottery.png",
  "/images/rafting.png",
  "/images/recreation.png",
  "/images/spa.png",
  "/images/surfing.png",
  "/images/volleyball.png",
  "/images/yoga.png",
] as const;

export const IDEAL_FOR_TAGS = ["friends", "couples", "families", "teams", "solo"] as const;

// Users.role values. "customer" is shown to people as "Member".
// A disabled account keeps its role behind a "disabled:" prefix, so every
// role check (role === "admin" etc.) fails closed while it is disabled.
export const ROLES = ["customer", "vendor", "admin"] as const;
export type Role = (typeof ROLES)[number];
export const DISABLED_PREFIX = "disabled:";

export function roleLabel(role: string): string {
  const base = role.startsWith(DISABLED_PREFIX) ? role.slice(DISABLED_PREFIX.length) : role;
  return base === "customer" ? "Member" : base === "vendor" ? "Vendor" : base === "admin" ? "Admin" : base;
}

export function isDisabledRole(role: string): boolean {
  return role.startsWith(DISABLED_PREFIX);
}

// vendors.verification_status values. "pending" is a new application, "contacted" an
// application someone has followed up on.
export const VENDOR_STATUSES = ["pending", "contacted", "approved", "rejected", "paused"] as const;
export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export function vendorStatusLabel(status: string): string {
  return (
    { pending: "New", contacted: "Contacted", approved: "Approved", rejected: "Declined", paused: "Paused" } as Record<string, string>
  )[status] ?? status;
}

// experiences.status values. "unpublished" means an admin took it down.
export const LISTING_STATUSES = ["draft", "published", "unpublished"] as const;

// bookings.status values.
export const BOOKING_STATUSES = ["requested", "confirmed", "declined", "cancelled", "completed"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// Home page group-size chips -> minimum free spots needed in a session.
export const GROUP_MIN_SPOTS: Record<string, number> = { "1": 1, "2": 2, "3-5": 3, "6+": 6 };

// Cities the city picker and "Use my location" support, Colombo first.
// Coordinates are only used in the browser to find the nearest city; never stored.
export const SUPPORTED_CITIES = [
  { name: "Colombo", lat: 6.9271, lng: 79.8612 },
  { name: "Kandy", lat: 7.2906, lng: 80.6337 },
  { name: "Galle", lat: 6.0535, lng: 80.221 },
  { name: "Weligama", lat: 5.9749, lng: 80.4294 },
  { name: "Kitulgala", lat: 6.9894, lng: 80.4176 },
] as const;

// Support contact shown on the forgot-password screen and footer (placeholder until confirmed).
export const SUPPORT_EMAIL = "hello@navira-co.com";

// Placeholder copy. Labelled as drafts wherever it appears.
export const VENDOR_TERMS_VERSION = "draft v0 (8 Oct 2026)";

// Reasons a vendor can pick when declining a request.
export const DECLINE_REASONS = [
  "Session is full",
  "Weather or safety",
  "Group size doesn't fit",
  "Not available at that time",
  "Other",
] as const;
