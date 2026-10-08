# Stage 4 design

The approved prompt is the presentation/content source of truth. Public pitch
retains header/footer; vendor routes share a role-gated responsive shell.
Two independent frontend areas: pitch/application and vendor operations.
Existing queries/endpoints are reused; no current-user query beyond useAuth.

Application payload keeps existing businessName/contactName/contactPhone/
contactEmail/city/activityTypes/capacity/typicalPrice/description/acceptTerms and
adds address, website, mapsLink. Server validates supported cities, categories,
whole integer price, +94 mobile and links. Anonymous placeholder owners cannot
log in until approval; generated password shown once on approval only.
Booking PATCH accepts status and optional vendorNote; declining additionally
requires declineReason from the shared catalog, joined server-side into vendorNote.
Confirmed cancellations use the existing release helper. Vendor bookings add
slot spotsLeft and redact nested customer.phone/email outside confirmed.
Dashboard adds honest checklist/month counts derived from current records.
