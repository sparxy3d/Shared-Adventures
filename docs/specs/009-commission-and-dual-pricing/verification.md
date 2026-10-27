# Stage 2 completion report

## Production handoff

Madushan must review and run `migrations/009_commission_dual_pricing.sql` against
the external Neon production database before this code is released. Take a
database backup/branch first. The migration is transactional and rerunnable.
It has been applied to development only. No production SQL, db:push, publishing,
seed-code change or ENABLE_SEED change was performed.

The SQL:

- Adds users.is_sri_lankan_resident, default true for existing accounts.
- Adds vendors.first_listing_published_at and nullable commission_override_rate.
- Adds nullable experiences.visitor_price_usd, leaving existing values empty.
- Changes experiences.currency_code and bookings.currency_code defaults to LKR.
  Existing currency codes and price amounts are not rewritten or converted.
- Adds booking resident/visitor counts, LKR/USD unit prices, exchange rate used,
  applied commission rate, commission amount LKR and vendor net amount LKR.
- Creates the singleton pricing_settings table and its default row: 10% intro,
  15% standard, 3 months and no USD/LKR rate.
- Starts existing published vendors' introductory clocks at migration time.
  Other vendors start on their first publication.
- Adds non-negative/range constraints on the new financial columns.

After release, an admin must enter a real USD/LKR rate in Settings before dual
priced visitor bookings are enabled. The migration deliberately does not invent
an exchange rate. Production default policies are 10%, 15%, 3 months unless the
settings table already exists with deliberately configured values.

## Financial verification

Command: `NODE_ENV=development npx tsx script/test-pricing.ts`.
The integration suite uses the real route handlers, auth guards, storage,
transactions and database in a temporary development schema. It does not run
server boot or seed code. All temporary schemas and fixture rows were removed.

All 14 scenarios passed:

1. First publication is recorded once and survives unpublish/republish.
2. Logged-out, member and vendor callers cannot edit/read admin pricing settings
   or set a vendor override.
3. Public pricing config exposes only the exchange rate.
4. Two residents at LKR 2,500 plus two visitors at USD 10 with rate 300 produce
   LKR 11,000, 10% commission of LKR 1,100 and vendor net of LKR 9,900.
5. Browser-supplied totals and commission values are ignored and recalculated.
6. Changing prices, commission and exchange settings does not change an existing
   booking's totals, unit prices, rate or commission snapshots.
7. A vendor after the introductory period receives 15%.
8. A per-vendor 7.5% override produces LKR 825 commission on LKR 11,000.
9. Exchange changes record both the admin and the timestamp.
10. A dual-priced visitor booking without an exchange rate receives HTTP 400
    without reserving inventory.
11. Count mismatches, invalid settings and fractional USD prices are rejected.
12. A listing without a visitor price charges all guests its LKR price even when
    the exchange rate is unset, while preserving the actual visitor count.
13. Signup requires residency status, and Profile can update it.
14. Introductory periods clamp calendar-month ends correctly; fractional exchange
    rates round to whole LKR.

`npm run check`, `npm run build` and `git diff --check` passed. Build emitted the
existing chunk-size/Browserslist warnings, not build failures.

## Browser verification

Used real authenticated fixture accounts and database responses, not API mocks.
At 1440px and 375px, inspected the editor price section, both member price cards,
mixed booking review, admin settings and vendor commission line. No horizontal
page overflow or browser page errors were detected on those screens.

Additional browser checks passed:

- Sent the mixed booking through the Review button and reached Request sent.
- Resident sorting used LKR 1,000 before LKR 2,500; visitor sorting used converted
  LKR 3,000 before LKR 15,000.
- A minimum LKR 2,800 filter excluded the resident prices but included the
  converted visitor prices.
- An exchange rate dated eight days earlier triggered the admin warning.
- Saving the vendor editor persisted the changed whole-USD visitor price.

The temporary preview server was stopped. No temporary users, vendors, listings
or bookings remain in public development tables. Public settings remain their
migrated defaults, with no exchange rate, and every existing listing still has
an empty visitor price.

## Screenshots

These are close-ups captured at the stated viewport widths using temporary test
data (USD/LKR 300 for the example). They do not imply a live configured rate.

| Screen | 1440px | 375px |
| --- | --- | --- |
| Listing editor | screenshots/pricing-editor-1440.jpg | screenshots/pricing-editor-375.jpg |
| Resident card | screenshots/pricing-card-resident-1440.jpg | screenshots/pricing-card-resident-375.jpg |
| Visitor card | screenshots/pricing-card-visitor-1440.jpg | screenshots/pricing-card-visitor-375.jpg |
| Booking breakdown | screenshots/pricing-booking-breakdown-1440.jpg | screenshots/pricing-booking-breakdown-375.jpg |
| Admin settings | screenshots/pricing-admin-settings-1440.jpg | screenshots/pricing-admin-settings-375.jpg |
| Vendor commission | screenshots/pricing-vendor-commission-1440.jpg | screenshots/pricing-vendor-commission-375.jpg |

## Assumptions and boundaries

- Existing accounts default to resident, editable in Profile. New signups must
  explicitly answer the question. No ID number is collected or stored.
- Historic first-publication time is unavailable, so existing published vendors
  start their intro period on migration day, not a guessed historic date.
- Vendor overrides take precedence over intro/standard rates.
- Intro periods use UTC calendar-month arithmetic, clamped for short months.
  Dates are displayed in Sri Lanka time.
- New bookings snapshot policy at request creation, not confirmation. Legacy
  bookings retain their totals with null new snapshots rather than fabricated
  historical commissions.
- The visitor subtotal is rounded once to whole LKR, then added to the resident
  subtotal. Commission is rounded to whole LKR and net equals total minus
  commission.
- With no visitor price, everyone pays the same LKR price. With a visitor price
  and no exchange rate, only resident pricing is displayed and visitor requests
  are refused on the server.
- Changing settings can change future quotes, never stored booking snapshots.
  The server recalculates the current price at request time.
- No payment gateway, charge collection, payout execution or production rollout
  is included. Financial amounts are stored in LKR for later payment work.

## Every changed or added file

Frontend components and styles:

- client/src/components/activity-card.css
- client/src/components/activity-detail-stage-three.css
- client/src/components/activity-session-panel.tsx
- client/src/components/booking-request-dialog.tsx
- client/src/components/booking-request-stage-three.css
- client/src/components/experience-card.tsx
- client/src/components/vendor-application-form.tsx
- client/src/components/vendor-editor-stage-five.css
- client/src/components/vendor-pitch-stage-four.css
- client/src/components/vendor-stage-four.css

Frontend hooks, helpers and pages:

- client/src/hooks/use-activity-booking.ts
- client/src/hooks/use-pricing-config.ts
- client/src/lib/discovery.ts
- client/src/lib/pricing.ts
- client/src/lib/vendor-listings.ts
- client/src/pages/account.tsx
- client/src/pages/signup.tsx
- client/src/pages/search.tsx
- client/src/pages/experience-detail.tsx
- client/src/pages/vendor/dashboard.tsx
- client/src/pages/vendor/listing-editor.tsx
- client/src/pages/admin/admin-vendor.css
- client/src/pages/admin/overview.tsx
- client/src/pages/admin/settings.tsx
- client/src/pages/admin/vendor-detail.tsx
- client/src/pages/admin/pricing-settings.css

Backend, schema, migration and verification code:

- server/routes.ts
- server/storage.ts
- shared/schema.ts
- shared/pricing.ts
- migrations/009_commission_dual_pricing.sql
- script/test-pricing.ts
- script/isolated-pricing-db.ts

Documentation and verification assets:

- docs/decisions/009-booking-financial-snapshots.md
- docs/specs/009-commission-and-dual-pricing/spec.md
- docs/specs/009-commission-and-dual-pricing/design.md
- docs/specs/009-commission-and-dual-pricing/tasks.md
- docs/specs/009-commission-and-dual-pricing/verification.md
- .agents/memory/MEMORY.md
- .agents/memory/neon-test-isolation.md
- All 12 screenshots listed above.
- .agents/agent_assets_metadata.toml (automatic screenshot library registration).

Unchanged: server/seed.ts, server/index.ts, server/db.ts and ENABLE_SEED.
