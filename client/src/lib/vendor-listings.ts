import type { Experience, AvailabilitySlot, Vendor } from "@shared/schema";
import { EXPERIENCE_IMAGES, IDEAL_FOR_TAGS, SUPPORTED_CITIES } from "@shared/catalog";
import { apiRequest } from "@/lib/queryClient";

export type ListingStatus = "draft" | "published" | "unpublished";
export type ListingInput = Pick<Experience, "title" | "category" | "description" | "locationText" | "region" | "city" | "durationMinutes" | "priceAmount" | "capacity" | "ageMin" | "safetyNotes" | "idealForTags" | "status" | "imageUrl">;
export const EXPERIENCE_IMAGE_CHOICES = EXPERIENCE_IMAGES;
export const IDEAL_FOR = IDEAL_FOR_TAGS;
export const CITY_CHOICES = SUPPORTED_CITIES.map(city => city.name);
export function imageAlt(path: string, fallback = "Experience photo"): string {
  const filename = path.split("/").pop()?.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return filename ? filename.replace(/\b\w/g, letter => letter.toUpperCase()) : fallback;
}

export function listingPayload(input: ListingInput): ListingInput {
  return {
    title: input.title.trim(), category: input.category, description: input.description || "",
    locationText: input.locationText || "",
    region: input.region || "", city: input.city || "", durationMinutes: input.durationMinutes ?? null,
    priceAmount: input.priceAmount ?? null, capacity: input.capacity ?? null,
    ageMin: input.ageMin ?? null, safetyNotes: input.safetyNotes || "",
    idealForTags: [...(input.idealForTags || [])], status: input.status, imageUrl: input.imageUrl || null,
  };
}
export async function createListing(input: ListingInput, adminVendorId?: number): Promise<Experience> {
  const payload = listingPayload({ ...input, status: "draft" });
  const response = await apiRequest("POST", adminVendorId == null ? "/api/vendor/experiences" : "/api/admin/experiences", adminVendorId == null ? payload : { ...payload, vendorId: adminVendorId });
  return response.json();
}
export async function updateListing(id: number, input: Partial<ListingInput>, admin = false): Promise<Experience> {
  const allowed: Partial<ListingInput> = {};
  const keys: (keyof ListingInput)[] = ["title","category","description","locationText","region","city","durationMinutes","priceAmount","capacity","ageMin","safetyNotes","idealForTags","status","imageUrl"];
  keys.forEach((key) => { if (key in input) (allowed as Record<string, unknown>)[key] = input[key]; });
  const response = await apiRequest("PATCH", `${admin ? "/api/admin" : "/api/vendor"}/experiences/${id}`, allowed);
  return response.json();
}
export async function loadListing(id: number, admin = false): Promise<Experience> {
  const response = await apiRequest("GET", `${admin ? "/api/admin" : "/api/vendor"}/experiences/${id}`);
  return response.json();
}
export async function loadListingSlots(id: number, admin = false): Promise<AvailabilitySlot[]> {
  const response = await apiRequest("GET", `${admin ? "/api/admin" : "/api/vendor"}/experiences/${id}/slots`);
  return response.json();
}
export async function duplicateListing(exp: Experience): Promise<Experience> {
  const allow: ListingInput = {
    title: `${exp.title.slice(0, 53)} (copy)`, category: exp.category, description: exp.description || "",
    locationText: exp.locationText || "", region: exp.region || "", city: exp.city || "",
    durationMinutes: exp.durationMinutes, priceAmount: exp.priceAmount, capacity: exp.capacity,
    ageMin: exp.ageMin, safetyNotes: exp.safetyNotes || "", idealForTags: exp.idealForTags || [],
    status: "draft", imageUrl: exp.imageUrl || "",
  };
  return createListing(allow);
}
export function nextOpenSession(slots: AvailabilitySlot[] | undefined): AvailabilitySlot | undefined {
  const now = Date.now();
  return slots?.filter(slot => slot.status === "open" && Date.parse(`${slot.date}T${slot.startTime}:00+05:30`) >= now)
    .sort((a,b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))[0];
}
export function applicationDetails(description?: string | null) {
  const raw = description || "";
  const marker = /^(?:— Application —|Application)$/m;
  const match = marker.exec(raw);
  const about = match ? raw.slice(0, match.index).trimEnd() : raw.trim();
  const block = match ? raw.slice(match.index) : "";
  const terms = block.match(/^Vendor terms \((.+)\) accepted: ([^\r\n]+)$/m);
  const dateText = terms?.[2] ? new Date(terms[2]) : null;
  const acceptedDate = dateText && !Number.isNaN(dateText.getTime()) ? new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "Asia/Colombo" }).format(dateText) : null;
  return {
    about, block,
    termsVersion: terms?.[1] || "Not recorded (onboarded by Free Spirit)",
    termsDate: acceptedDate || "Not recorded (onboarded by Free Spirit)",
    metadata: block || "Not recorded (onboarded by Free Spirit)",
  };
}
export function profilePayload(vendor: Vendor, about: string) {
  const { block } = applicationDetails(vendor.description);
  return { businessName: vendor.businessName, description: [about.trim(), block].filter(Boolean).join(about.trim() && block ? "\n\n" : ""), city: vendor.city || "", region: vendor.region || "", address: vendor.address || "", contactEmail: vendor.contactEmail || "", contactPhone: vendor.contactPhone || "" };
}
