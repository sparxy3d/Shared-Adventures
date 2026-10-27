# Multi-activity applications and login fixes

## Status

Finished and verified in development, including 14 browser checks and eight
screenshots at 1440px and 375px. No production migration or publishing has been performed.
`server/seed.ts`, `server/index.ts`, `server/db.ts` and ENABLE_SEED are unchanged.

## Production handoff

Migration: `migrations/011_multi_activity_applications.sql`.
Madushan must apply it to production before publishing this code, with earlier
migrations through 010 already applied:

- Adds nullable `vendors.application_activities` JSONB for validated activity
  records on new applications.
- Adds nullable `experiences.typical_group_sizes` TEXT[] for preferences copied
  into the drafts.
- No data rewrite, backfill, price conversion or deletion. Existing applications
  retain null structured activities and their original description text.
- Transactional and rerunnable using ADD COLUMN IF NOT EXISTS.

It has been applied only to development using the development database selection.
Neither db:push nor a production database connection was used.

## Behavior and assumptions

- One to ten activities, each with its own category, whole LKR price, optional
  whole USD price and group preferences. Each needs at least one group selection.
  Activity names are limited to 60 characters to fit the listing editor.
- Contact detection applies to activity names and optional descriptions, using
  the existing listing policy. General business description remains separate.
- New applications store structured activities. Legacy single-price/category
  payloads and records remain supported and visible in the admin view.
- Approval creates all drafts in the same transaction as role promotion and
  approval. The existing vendor row lock and status check prevent repeat creation.
- Photos, capacity, duration and sessions are not guessed. Location and city
  come from the application. The owner completes the drafts before publishing.
- Group preferences are not a maximum capacity. They are stored and shown in the
  vendor/admin listing editor as application context without changing capacity.
- Legacy applications do not produce guessed listings. Admins create those
  listings using the existing editor.
- The confirmation says: "Thanks. We'll call you within 2 working days to talk
  it through." No email or SMS provider/notification was added.
- The login photo caption is removed only on login. Other auth screens retain
  their existing presentation.
- Existing private verification-document storage and access controls are unchanged.
  Public-photo App Storage setup is outside this change and was not activated or
  verified here. The onboarding regression's photo tests use a test-only adapter.

## Tests

### Real HTTP, authentication and isolated PostgreSQL

Command: `NODE_ENV=development npx tsx script/test-multi-activity-applications.ts`

- PASS: missing ID and unticked terms are rejected by the server.
- PASS: zero or eleven activities, fractional prices, missing enabled visitor
  price, an unknown category, contact details and overlong descriptions rejected.
- PASS: two activities save; no listings exist before approval.
- PASS: approval creates exactly two drafts with correct titles, categories,
  descriptions, group preferences, resident and visitor prices.
- PASS: LKR 2,500 / USD 10 for pottery; LKR 1,500 / no visitor price for futsal.
  No multiplication or division by 100.
- PASS: repeated approval returns 409 and does not duplicate listings.
- PASS: old single-price/category applications remain readable and approvable.

### Regression and build checks

- PASS: `npm run check`.
- PASS: `npm run build` (existing non-fatal bundle-size warnings remain).
- PASS: `script/test-onboarding.ts`, including password guards, document/photo
  validation and booking/demo controls. Photo tests use the documented test-only
  object adapter, not an unconfigured cloud bucket.
- PASS: all 14 `script/test-pricing.ts` scenarios.

### Browser acceptance checks

Command: `node script/capture-application-fixes.cjs <isolated-fixture-url>`.
Results and screenshots are recorded in
`generated-artifacts/application-fixes/browser-checks.json`.
PASS: 14 browser checks, eight screenshots, zero browser page errors. These cover
individual missing-ID/terms errors, first-click submission, focus and scroll,
counted combined errors and red field highlighting, failure-state preservation,
sending state, real two-activity saving and approval, the signed-in admin
application dialog and login layout at 1440px/375px.

The development workflow was restarted successfully and the live login preview
was checked again at 375px. Test data lived only in disposable PostgreSQL schemas;
all were dropped and the fixture server stopped. Remaining test schemas: zero.

### Existing observations, not changed

Development startup logs "Database already seeded, skipping...". The seed module,
startup code and ENABLE_SEED were deliberately left unchanged. Existing
Browserslist/PostCSS and bundle-size warnings remain non-fatal.

## Files changed

### Application, admin and login UI

- `client/src/components/vendor-application-form.tsx`
- `client/src/components/vendor-pitch-stage-four.css`
- `client/src/pages/admin/applications.tsx`
- `client/src/pages/login.tsx`
- `client/src/components/auth-layout.tsx`
- `client/src/components/stage-one.css`
- `client/src/pages/vendor/listing-editor.tsx`

### Server, validation and schema

- `server/routes.ts`
- `server/storage.ts`
- `shared/application-activities.ts`
- `shared/schema.ts`
- `shared/catalog.ts`
- `migrations/011_multi_activity_applications.sql`

### Verification and documentation

- `script/test-multi-activity-applications.ts`
- `script/capture-application-fixes.cjs`
- `docs/specs/011-multi-activity-applications/spec.md`
- `docs/specs/011-multi-activity-applications/design.md`
- `docs/specs/011-multi-activity-applications/tasks.md`
- `docs/specs/011-multi-activity-applications/verification.md`
- `docs/decisions/011-structured-application-activities.md`
- `.agents/memory/MEMORY.md`
- `.agents/memory/json-column-validation.md`
- `.agents/memory/vendor-onboarding.md`
- `.agents/memory/verification-tooling.md`

Generated screenshots, browser results and the downloadable self-contained HTML
report are under `generated-artifacts/application-fixes/`, excluded from Git and
publishing. Screenshots contain disposable development fixtures, not customers.
