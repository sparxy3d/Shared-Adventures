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

// vendors.verification_status values. "pending" is an application waiting for review.
export const VENDOR_STATUSES = ["pending", "approved", "rejected", "paused"] as const;
export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export function vendorStatusLabel(status: string): string {
  return (
    { pending: "Applied", approved: "Approved", rejected: "Declined", paused: "Paused" } as Record<string, string>
  )[status] ?? status;
}

// bookings.status values.
export const BOOKING_STATUSES = ["requested", "confirmed", "declined", "cancelled", "completed"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// Home page group-size chips -> minimum free spots needed in a session.
export const GROUP_MIN_SPOTS: Record<string, number> = { "1": 1, "2": 2, "3-5": 3, "6+": 6 };
