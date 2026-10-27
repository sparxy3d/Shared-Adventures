# Vendor fee plans: verification and production handoff

Finished in development. No publishing or production writes.

## Cause and correction

The previous helper required a first-publication timestamp before a vendor could
qualify for introductory pricing. An unpublished vendor therefore fell through
to the standard rate. The corrected helper applies the introductory rate while
the clock is unstarted, starts its duration only at first publication, and uses
the standard rate at expiry. The development business named Test was checked
read-only: its corrected effective fee is 10%, with no start or end date yet.

Custom three-part plans previously could not be represented by the single flat
override. New plans store all three values, and override eligibility does not
itself disable the introductory phase. Calendar-month expiry uses Sri Lanka time
with month-end clamping.

## Completed interface

- Compact confirmation: Application received heading, 28px desktop / 22px phone;
  exact thank-you message in 17px / 16px body text, reduced padding and height.
- Dashboard heading at most 32px, reduced dashboard-only card spacing/padding,
  same layout. The Free Spirit fee card explains introductory timing, vendor
  retention during the period and retention at the standard rate.
- Approval opens a review dialog, refetches real global settings, and requires
  valid introductory rate, introductory months and standard rate. Loading and
  retryable errors cannot approve using invented defaults.
- The same three fields are editable on the admin vendor page, with actual
  global fallback values for inherited fields. Saving persists through reload.

## Migration

`migrations/012_vendor_fee_plans.sql`

Applied to development only. Madushan must apply it to production after 011 and
before publishing this code. It adds nullable vendor columns:

- `commission_introductory_rate` NUMERIC(5,2)
- `commission_standard_rate` NUMERIC(5,2)
- `commission_introductory_months` INTEGER

It adds the `vendors_fee_plan_values` check: rates 0 to 100, months 0 to 120.
It is transactional and rerunnable. No backfill, price conversion, booking
snapshot rewrite or existing flat-override rewrite occurs.

## Tests

`NODE_ENV=development npx tsx script/test-vendor-fees.ts`
uses disposable PostgreSQL schemas and real guarded HTTP endpoints:

- PASS: default approval stores 10% / 3 months / 15%.
- PASS: unstarted eligibility is 10%, with no invented start/end timestamp.
- PASS: introductory pricing through the period and standard pricing at its exact
  expiry boundary.
- PASS: custom approval stores 8% / 6 months / 12%, with matching eligibility.
- PASS: real bookings charge 10% then 15%, and 8% then 12% for the custom plan.
- PASS: LKR 5,000 default booking snapshots fee LKR 500 and net LKR 4,500.
- PASS: changing vendor/global settings leaves original total, rate, fee and net
  snapshots unchanged; subsequent bookings use the edited vendor plan.
- PASS: browser-supplied totals/fees are recalculated; invalid percentages,
  fractional months and more than two rate decimal places are refused.
- PASS: admin-only guards refuse logged-out, member and vendor callers.
- PASS: existing flat overrides remain effective.
- PASS: calendar-month expiry across a Sri Lanka / UTC date boundary.

Regression:
- PASS: all 14 existing pricing scenarios.
- PASS: all existing multi-activity application integration groups.
- PASS: `npm run check`.
- PASS: `npm run build`, with existing non-fatal bundle-size warnings.

`script/capture-vendor-fees.cjs` ran against the disposable fixture server:
- PASS: seven browser checks, six requested screenshots, zero page errors.
- Real applications produce compact confirmation at 1440px and 375px.
- Signed-in dashboard displays correct unstarted rates without horizontal overflow.
- Approval preloads actual global values and saves defaults/custom plans.
- Admin vendor-page editing survives reload.

All disposable schemas were dropped and the fixture server stopped. A read-only
check found zero remaining test schemas. The duplicate development port-5000
listener was stopped; the managed application workflow now runs successfully.
The public application page was also checked in the real preview at 375px.
Existing Browserslist/PostCSS warnings remain, with no requested fix deferred.

## Assumptions

- A zero-month period disables introductory pricing.
- Existing vendors with no saved plan inherit global settings. Approval now saves
  the reviewed plan, so later global edits do not replace that agreement.
- Legacy flat overrides remain until explicitly replaced; the old flat API stays
  compatible. Saving a three-field plan clears the old flat override.
- Editing duration measures from the original first publication; it does not
  restart the clock.
- As before, fees are snapshotted when a booking request is created. A later fee
  change or expiry never changes a previously created booking.
- No payment gateway, payout execution, email or App Storage setup was added.

## Every file changed

Application/UI:
- `client/src/components/vendor-application-form.tsx`
- `client/src/components/vendor-pitch-stage-four.css`
- `client/src/components/vendor-stage-four.css`
- `client/src/pages/vendor/dashboard.tsx`
- `client/src/pages/admin/applications.tsx`
- `client/src/pages/admin/vendor-detail.tsx`
- `client/src/pages/admin/admin-vendor.css`

Server/shared:
- `shared/schema.ts`
- `shared/pricing.ts`
- `server/routes.ts`
- `server/storage.ts`
- `migrations/012_vendor_fee_plans.sql`

Tests:
- `script/test-vendor-fees.ts`
- `script/capture-vendor-fees.cjs`

Docs/memory:
- `docs/specs/012-vendor-fee-plans/spec.md`
- `docs/specs/012-vendor-fee-plans/design.md`
- `docs/specs/012-vendor-fee-plans/tasks.md`
- `docs/specs/012-vendor-fee-plans/verification.md`
- `docs/decisions/012-vendor-fee-plans.md`
- `.agents/memory/MEMORY.md`
- `.agents/memory/vendor-fee-policy.md`

Unchanged: `server/seed.ts`, ENABLE_SEED, server boot/database connection code,
packages and workflow configuration. Generated screenshots, browser results and
the self-contained HTML report live in ignored `generated-artifacts/vendor-fees/`.
