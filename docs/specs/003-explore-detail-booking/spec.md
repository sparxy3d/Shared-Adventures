---
status: approved
tier: 2
---
# Stage 3 — Explore, activity detail and booking requests

The user's Stage 3 implementation prompt is the approved specification.

- Change shared support email to hello@freespirit.club; mailbox not live yet.
- Explore: URL-backed supported city/group/time/date/category filters, client-only whole-LKR min/max, soonest/price sorting, 24-card pagination, sticky desktop filters and phone Apply sheet. Use Stage 2 cards.
- Public detail: friendly 404, single 3:2 image, factual title/vendor/capacity/duration, share/save, description/real suitability tags/safety/age/location and up to four same-category cards.
- Booking panel: real slots grouped in Sri Lanka time, 7 dated groups initially, full/almost-full/spots states, group-aware disabled pills and Next session, whole-LKR total. Sticky desktop panel; phone price bar/session sheet.
- Request: identity, review, sent. Login/signup retain session/group via URL. Shared guest UI setting OFF; no guest server support. Submit ONLY experienceId, slotId, qty and customerNote; server prices and reserves. Handle 401 back to identity and 409 with friendly message/fresh slots. Refresh bookings and slots after success.
- Own-bookings response: vendor phone/email and activity location/city only when confirmed, otherwise null. Preserve session ownership and strip customer contact. Show confirmed-only contact block in My bookings.
- Four states, role gates via existing useAuth/RequireRole, focus/44px targets/reduced motion, existing shared look. No ratings/review counts/invented availability.
- Existing stack and schema only; no seed/flag/boot writes/database configuration changes, guard weakening, package additions, schema pushes, production operations or publish.
- Verify at 390/1280: URL filters, sorting/pagination/sheet, public/404 detail, real member request for two, Requested in My bookings, capacity disabling/409 and logout/login choice restoration. Report each changed file, checks and limitations.
