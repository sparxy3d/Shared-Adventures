import { queryClient } from "@/lib/queryClient";
import { categoryLabel } from "@shared/catalog";

export type AdminApplicationFields = {
  ownerName: string;
  contactName: string;
  ownerEmail: string;
  ownerPhone: string;
  businessName: string;
  city: string;
  category: string;
  activityTypes: string[];
  capacity: string;
  typicalPrice: string;
  website: string;
  mapsLink: string;
  description: string;
  termsVersion: string;
  termsAcceptedAt: string | null;
};

export function refreshAdmin() {
  const families = [
    "/api/admin/stats", "/api/admin/vendors", "/api/admin/experiences",
    "/api/admin/bookings", "/api/admin/members", "/api/experiences",
    "/api/vendor", "/api/member", "/api/bookings", "/api/auth/me",
  ];
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && families.some((family) => key === family || key.startsWith(`${family}/`) || key.startsWith(`${family}?`));
    },
  });
}

export function formatAdminDate(value?: string | Date | null, withTime = false): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-LK", {
    day: "numeric", month: "short", year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "Asia/Colombo",
  }).format(date);
}

export function applicationFields(description = ""): AdminApplicationFields {
  const marker = "— Application —";
  const markerIndex = description.indexOf(marker);
  const profileDescription = (markerIndex < 0 ? description : description.slice(0, markerIndex)).trim();
  const block = markerIndex < 0 ? description : description.slice(markerIndex + marker.length);
  const field = (source: string, names: string[]) => {
    const labels = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const match = source.match(new RegExp(`(?:^|\\n)\\s*(?:${labels})\\s*:\\s*(.*)`, "i"));
    if (match) return match[1].trim();
    return "";
  };
  const either = (names: string[]) => field(block, names) || field(description, names);
  const contactName = either(["Contact", "Contact name", "Owner name", "Owner", "Name"]);
  const activityTypes = either(["Activity types"]).split(",").map((value) => value.trim()).filter(Boolean);
  const rawCategory = either(["Category"]);
  const terms = block.match(/(?:^|\n)\s*Vendor terms\s*\((.*)\)\s*accepted\s*:\s*(.+)/i);
  const fallbackTerms = block.match(/(?:^|\n)\s*(?:Terms accepted(?: at)?|Accepted terms(?: at)?)\s*:\s*(.+)/i);
  let termsVersion = terms?.[1]?.trim() ?? "";
  if (termsVersion.startsWith("(") && termsVersion.endsWith(")")) termsVersion = termsVersion.slice(1, -1);
  const acceptedValue = terms?.[2]?.trim() ?? fallbackTerms?.[1]?.trim() ?? "";
  const acceptedTimestamp = acceptedValue.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/);
  return {
    ownerName: contactName,
    contactName,
    ownerEmail: either(["Email", "Owner email", "Contact email"]),
    ownerPhone: either(["Phone", "Mobile", "Owner phone", "Contact phone"]),
    businessName: either(["Business", "Business name", "Vendor"]),
    city: either(["City"]),
    category: activityTypes.length ? activityTypes.map(categoryLabel).join(", ") : rawCategory,
    activityTypes,
    capacity: either(["Typical group capacity", "Capacity"]),
    typicalPrice: either(["Typical price", "Price"]),
    website: either(["Website or Instagram", "Website", "Instagram"]),
    mapsLink: either(["Google Maps", "Maps link"]),
    description: profileDescription,
    termsVersion,
    termsAcceptedAt: acceptedTimestamp?.[0] ?? (acceptedValue || null),
  };
}

export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(String(response.status));
  return response.json() as Promise<T>;
}

export function errorMessage(error: unknown): string {
  const status = Number((error as Error)?.message);
  if (status === 401 || status === 403) return "You don’t have permission to complete this action.";
  if (status === 404) return "That record is no longer available. Refresh and try again.";
  if (status === 409) return "This item changed while you were working. Refresh and try again.";
  return "We couldn’t complete that request. Please try again.";
}

export function isDemoEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase().endsWith("@freespirit.com");
}

export function formatLkr(value?: number | string | null): string {
  if (value == null || value === "") return "—";
  const amount = Number(value);
  return Number.isFinite(amount) ? `LKR ${new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 }).format(amount)}` : "—";
}
