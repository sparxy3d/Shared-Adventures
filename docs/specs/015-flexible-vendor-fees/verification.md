# Verification: flexible vendor fees

## Summary

Public fee terms now describe each vendor's agreed plan rather than promising fixed
percentages. The vendor dashboard explains a fee-free introduction, a reduced-fee
introduction, the standard fee and the period before first publication. Admins can
preview plans and enter zero fees or zero introductory months.

## Acceptance criteria

| Criterion | Verification | Result |
| --- | --- | --- |
| Exact clause 5.1, example qualifier only in 5.9 | Node comparison with git HEAD | Pass |
| Fee table and 7.6 unchanged | Byte-for-byte comparison with git HEAD | Pass |
| 0% for 3 months then 15% | Actual HTTP approval and bookings in disposable DEV schema; expiry boundary assertions | Pass |
| 5% for 2 months then 12% | Actual HTTP approval and bookings; expiry boundary assertions | Pass |
| Zero months means standard fee | Actual new booking charges standard fee; helper before first publication has no introduction | Pass |
| Existing bookings unchanged | Re-read stored financial snapshots after global and vendor plan changes | Pass |
| Fees 0..30 and months 0..12 | Settings, approval and vendor-plan HTTP validation; inclusive boundaries accepted, 30.01%, 13 months, negative/fractional/overprecision values refused | Pass |
| Admin guards and legacy flat overrides | Real unauthenticated/member/vendor HTTP calls; helper assertion | Pass |
| Dashboard and admin responsive wording | Authenticated browser checks at 1440/375px, screenshots visually inspected | Pass |

## Commands

- `npm run check`: pass.
- `npm run build`: pass. Existing Browserslist, PostCSS and large-chunk warnings only.
- `NODE_ENV=development npx tsx script/test-pricing.ts`: pass, 14 scenarios.
- `NODE_ENV=development npx tsx script/test-vendor-fees.ts --screenshots`:
  pass, all HTTP/SQL assertions; fixture then stopped gracefully, cleanup exited zero.
- `NODE_ENV=development npx tsx script/test-multi-activity-applications.ts`: pass,
  application validation, two correctly priced draft listings and historical acceptances.
- `node script/capture-flexible-fees.cjs <disposable-fixture-url>`: pass at 1440/375px,
  two active plans, zero-month standard wording, admin labels/previews including singular
  month, invalid-plan button states, terms and no horizontal overflow; no page errors.
  Eight screenshots are in `generated-artifacts/flexible-vendor-fees/`.
- `npm run db:status`: pass, all six existing files applied, nothing pending.
- `git diff --check`: pass.
- Development workflow restarted once after code changes, serving port 5000.
- Public terms screenshot at 1440px: correct layout. Existing development-only
  React Fragment metadata warnings from Replit instrumentation were observed,
  not changed by this scoped update.

## Database and production

No schema change and no new migration. Existing vendor plans and booking rows are
not migrated, clamped or recalculated. HTTP tests create and remove disposable DEV
schemas, including an isolated session table.

Production needs no SQL, secret changes or configuration changes for this feature.
Nothing was published or connected to the production database.
Neither server/seed.ts nor ENABLE_SEED was changed.

## Assumptions

- Both introductory and standard fees use the requested 0..30% range.
- Two-decimal fee support remains; months must be whole.
- Global default values are unchanged. They prefill new agreements, not public promises.
- Historical out-of-range vendor plans remain effective until explicitly replaced
  with valid plans. Existing financial snapshots remain authoritative.
- No introductory period means standard wording even before first publication.
- The terms version stays 1.0, as requested; the worked 15% example is not a promised rate.

## Files changed

### Application

- `server/routes.ts`
- `client/src/content/vendor-terms.md`
- `client/src/pages/vendor/dashboard.tsx`
- `client/src/pages/admin/applications.tsx`
- `client/src/pages/admin/vendor-detail.tsx`
- `client/src/pages/admin/settings.tsx`
- `client/src/pages/for-vendors.tsx`

### Tests

- `script/test-vendor-fees.ts`
- `script/test-pricing.ts`
- `script/capture-flexible-fees.cjs`

### Documentation and memory

- `docs/context/product.md`
- `docs/decisions/016-flexible-vendor-fees.md`
- `docs/decisions/README.md`
- `docs/specs/015-flexible-vendor-fees/spec.md`
- `docs/specs/015-flexible-vendor-fees/design.md`
- `docs/specs/015-flexible-vendor-fees/tasks.md`
- `docs/specs/015-flexible-vendor-fees/verification.md`
- `.agents/memory/vendor-fee-policy.md`
- `.agents/memory/MEMORY.md`

## Deviations and release readiness

The first fee test run used an expired four-month fixture with the new two-month
plan while expecting its introductory fee. The fixture was corrected, not the
fee calculation or validation. The final run uses the correct active-period date.

No additional feature work was deferred. Existing legal promises about payments,
payouts and document/backup retention still need owner confirmation before publishing
the terms, as recorded in the vendor-terms verification. No payments added here.

**Ready to publish: No**
This fee change is complete and tested. Existing legal/operational release checks
for the terms still require owner confirmation; no deployment was performed.
