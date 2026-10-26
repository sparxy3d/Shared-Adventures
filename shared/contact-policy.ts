export const CONTACT_DETAILS_MESSAGE = "Please don't include phone numbers, emails, links or social handles. Customers contact you through Free Spirit after booking.";
export const GOOGLE_MAPS_MESSAGE = "Enter a Google Maps or Google Business URL, or leave this field empty.";

/** Parse hosts, rather than trusting substrings such as google.com.evil.example. */
export function isGoogleBusinessUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  try {
    const url = new URL(value.trim());
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (host === "google.com" || host === "www.google.com") return /^\/maps(?:\/|$)/i.test(url.pathname);
    return ["maps.google.com", "maps.app.goo.gl", "g.page", "business.google.com"].includes(host);
  } catch { return false; }
}

/** Listing prose cannot advertise direct contact channels. Dates/prices are not phone numbers. */
export function containsContactDetails(value: string | null | undefined): boolean {
  if (!value) return false;
  if (/(?:https?:\/\/|www\.|mailto:|tel:|@[a-z0-9_][a-z0-9_.]*|\b[a-z0-9][a-z0-9.-]*\.(?:[a-z]{2,24})(?:\/[^\s]*)?)/i.test(value)) return true;
  const candidates = value.match(/(?:\+?\d[\d\s().-]{5,}\d)/g) ?? [];
  return candidates.some(candidate => {
    const digits = candidate.replace(/\D/g, "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(candidate.trim())) return false;
    return digits.length >= 7 && digits.length <= 15;
  });
}
