# Stage 4 — vendor onboarding and bookings

Status: approved
Tier: 2
Approval: the user's Stage 4 implementation request.

## Boundaries
Existing React/Vite/Express/Postgres only. No seed, ENABLE_SEED, startup writer,
database connection, schema, deployment, package or other-page changes. No db:push
or DB_TARGET=prod. Preserve guards/ownership/zod. Sri Lanka time, whole LKR via
formatPrice, five catalog categories. Never invent metrics, testimonials or offers.
Preserve existing listings/profile/availability pages for Stage 5.

## Public pitch and application
/for-vendors uses public header/footer, existing activity photo and exact hero:
“Fill your sessions with groups who want to do something together.”
Apply to list scrolls to inline form; Log in as vendor links to login.
Audience: friends tonight, team outings, families/couples weekends.
Process: You list — we set you up; Customers book — you confirm;
You get paid — after the session.
Costs: “Simple commission only on completed bookings — details on application.”
Real-feature preview cards: dashboard, booking alerts marked coming soon, own
listing page, weekly schedule. No sample invented customer/bookings numbers.
FAQ: prices set by vendor; vendor confirms each request; payment after session,
details agreed on application; pause by asking us.

Same form inline and /for-vendors/apply, no login requirement: business name,
contact person, +94 mobile, email, supported city, address, categories multi-select,
short description, typical group size, whole-LKR price, website/Instagram,
optional maps URL, required linked draft-vendor-terms consent.
Validate on blur, field errors; shared single thank-you constant:
“Thanks — we'll call you to talk it through.”

Existing application endpoint accepts fields, stores address in existing column
and remaining details plus dated terms acceptance in description. Non-admin
logged-in callers own their application. Anonymous existing email returns 400
“This email already has an account — log in first, then apply”.
New anonymous applicant gets placeholder member password starting !, then pending
vendor. Placeholder cannot authenticate. Approval promotes owner to vendor and
approves vendor; only placeholder owners get a new random hashed temporary
password returned once with login email, never other owners.

## Vendor shell
Every /vendor route inside existing vendor RequireRole/useAuth. Logged-out login
and back; member/admin not allowed with own-home link. Logo/orange Vendor tag,
desktop navigation Dashboard, Bookings, Listings, Schedule, Stats, Business profile;
business name/logout bottom. Phone Home/Bookings/Listings/Schedule/More; More
Stats/Profile/logout. Existing Stage 5 pages remain linked or next-update placeholder.

## Dashboard and bookings
Existing dashboard API: Sri Lanka greeting/business/status (Approved, not live
yet/Live/Paused). Not-live checklist links listing/schedule/photos/admin review
and marks only real completed steps. Oldest-first request cards with member first
name, activity, human session time, quantity and whole-LKR total. Confirm and
Decline; decline requires catalog reason and optional note. Empty caught-up.
Next seven days grouped by day/session with actual summed booked quantity and
remaining slot spots. Dashboard response adds remaining spots. This month actual
requests, confirmed bookings, booking value and stats link.

/vendor/bookings tabs Requests/Upcoming/Past/Declined-cancelled; name search,
desktop table/mobile cards including session, activity, member, qty, total,
status, received time. Detail has member note, same-session other bookings,
phone/email only confirmed, Confirm/Decline and confirmed Cancel with destructive
“The member will be told” confirmation.
Vendor list and dashboard redact phone/email unless confirmed.
Allow only requested→confirmed/declined and confirmed→cancelled vendor updates.
Decline requires catalog reason; reason/note saved together in vendorNote.
Existing ownership check and spot-release helper remain.
No email/SMS integration is implied: cancellation is reflected in member bookings.

## Shared quality and acceptance
Max 1200px/16px phone gutters/no overflow320; Plus Jakarta Sans/body16/min13;
orange #FF6B24 primary/selected/highlights, charcoal #171717 headings,
cream #FFF8F1 backgrounds, white rounded16 cards, slate #64748B secondary.
44px targets/focus/AA/reduced-motion/alt; grey skeleton/empty+action/error+Retry/
role gates; success toasts, inline errors.
Test anonymous new/duplicate email application; placeholder approval and password
login; vendor dashboard/bookings at390/desktop; real member requests confirm,
decline(reason+note), cancel and spots restored/member status and note visible;
contacts hidden before confirming; member/admin /vendor denied. Report precise
changed files, actual real-versus-fixture checks, assumptions and incomplete work.
