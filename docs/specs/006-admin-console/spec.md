# Stage 6 — Admin console

Status: approved
Approval: user's Stage 6 implementation instruction, 8 October 2026.
Tier: 2.

## Guardrails

Existing React/Vite/Express/Postgres, no dependencies or schema changes; no seed,
ENABLE_SEED, startup writes, DB connection/environment changes or publishing.
Whole LKR via existing helper, five shared categories/cities, no fabricated metrics.
Admin routes retain the prefix admin guard and zod validation; confirmations for
destructive actions. Reuse useAuth/RequireRole, not another current-user query.
Shared Stage 1 look, focus/44px targets/reduced motion, loading skeleton,
one-sentence empty state with action, plain error with Retry.

## UI acceptance

Replace old admin dashboard entirely. Role gate and shell: logo, charcoal Admin
tag, desktop left navigation Overview/Applications(new count)/Vendors/Listings/
Bookings/Members/Settings; phone hamburger. Seven routes plus vendor detail.
Every data list: search, filter chips, sortable columns, 25 rows/page and phone
stacked cards. Real data only.

- Overview: applications waiting, live vendors, published listings, real members,
  bookings this week, unanswered requests >24h; filter-linked tiles. Attention:
  those old requests, approved/not-live >7 days, published/no sessions next14days.
  Demo banner to Settings.
- Applications: New/Contacted/Declined table, all application fields and terms
  timestamp parsed from description. Contact, reason-required decline, approve;
  one-time credential dialog with copy and phone/WhatsApp instruction.
  Disabled internal notes with go-live label.
- Vendors: city/status/counts/monthly bookings/demo(owner email @freespirit.com),
  create with one-time credentials. Detail Profile/Listings/Schedule/Bookings/
  Stats, admin-editing banner on all tabs, stage5 editor/schedule/stats reused.
  Pause confirmation, resume, member password reset; CSV statistics export.
- Listings: photo/vendor/category/city/whole-price/status/nextsession/demo,
  status/category/city/demo filters. Publish; reason-required confirmed Unpublish,
  reason transient and toast, phone-only explanation; admin editor; public View.
  No review queue.
- Bookings: session/activity/vendor/member/group/whole total/status/request age.
  Status/vendor/date-range/older-than24h filters. Confirm/Decline/Cancel, decline
  catalog reason plus note, destructive confirmations. Server note prefix
  "By Free Spirit: "; existing release helper preserved.
- Members: name/email/mobile/role/joined/count/status including placeholder flag.
  Reset one-time dialog; confirmed disable/enable; role change with vendor-record
  requirement. Cannot change own role or disable self.
- Settings read-only/go-live: demo ON, ratings/offers OFF, shared cities/support.

## API contract

Existing admin endpoints reused. GET /api/admin/stats retains existing metrics,
adds unansweredOver24h and attention {requests, vendors, listings}, weekStart/weekEnd.
GET /api/admin/vendors adds bookingsThisMonth, live and approvedAt.
GET /api/admin/members adds hasLogin; no password.
POST /api/admin/vendors/:id/contacted accepts {}, pending only.
GET /api/admin/vendors/:id returns flat vendor plus owner/list/month fields.
GET /api/admin/vendors/:id/experiences and /bookings return vendor-scoped arrays.
Admin equivalents POST /api/admin/experiences/:id/generate-sessions, /close-day
share stage5 validators/storage; admin one-off POST /experiences/:id/slots and
DELETE /slots/:id share safe deletion. GET slots validates listing existence.
Admin booking PATCH accepts status, declineReason, vendorNote; confirmed only from
requested, declined only from requested, cancelled only from confirmed, completed
only from confirmed. All notes prefixed server-side, release helper unchanged.
Admin role update to vendor requires existing owned vendor, own-role changes refused.
Admin listing PATCH supports draft/published/unpublished (already catalog values).

## Date/count definitions and shortcuts

Week is current Monday–Sunday in Sri Lanka. Vendor monthly requests and shared
stats are received-date cohorts; confirmed includes completed. Counts exclude
placeholder passwords starting "!"; member role includes disabled members.
Live = approved vendor with published listing. Demo = owner email suffix.
Approval dates recorded as Approved at: ISO in existing Application block for
new approval/create. Unknown historical dates excluded, not inferred. Contacted
status already supported in existing text column. No storage for transient
unpublish reason/internal notes/settings switches.

## Verification

Typecheck/build, isolated guard/validation/storage tests and development API/browser
tests. New logged-out applications: contact/approve/credential-login and decline.
Pause/resume and public visibility; unpublish/vendor403; admin booking
confirm/decline/cancel and prefixed note visible to vendor/member; test member
reset/login/disable/enable/vendor-role refusal; self-protection. Member/vendor
not-allowed UI and adminAPI403. Laptop/390px screens and list sorting/pagination.
Restore demo changes/passwords and release test reservations; identify test data
retained. Report every changed file and explicit incomplete/untested cases.
