# Stage 3 implementation and production handoff

## Status

Implemented in development. Not published. Not fully activated: this project has
no default App Storage bucket. Real listing-photo uploads return a clear error
until one is configured. No local-disk or private-document fallback is used.

The photo integration tests use a test-only in-memory object adapter with real
HTTP handlers, authentication, image processing and isolated PostgreSQL tables.
They do not prove persistence in a live cloud bucket.

## Production steps for Madushan

1. Review and apply `migrations/010_vendor_onboarding_gaps.sql` to production
   after the earlier migrations, including 009, and before releasing this code.
   This agent applied it only to development. No production SQL was executed.
2. It adds `users.must_change_password`, `vendors.is_demo`,
   `experiences.is_demo`, `experience_images.storage_key`, the singleton
   `site_settings` table, and the deduplicated `waiting_list` table.
3. Existing cover-image references are retained as gallery records without
   moving or overwriting any existing image file.
4. The one-time demo backfill flags existing vendors whose owner email ends in
   `@freespirit.com`, and their existing listings. A migration marker prevents
   reruns from classifying subsequently created businesses as demo.
5. Production defaults are **demo content hidden and bookings closed**.
   Development was explicitly initialized with **demo content visible and
   bookings closed**. New vendors and listings default to non-demo.
6. Configure a default App Storage bucket for this Replit project. Open
   **Tools > App Storage**, then **Create new bucket** in the bucket dropdown.
   Verify cloud upload/read/delete before any release. No new user-supplied
   storage credentials are required by this implementation.
   The development-only full check is:
   `NODE_ENV=development npx tsx script/test-onboarding.ts --real-storage`.
   It keeps database fixtures isolated and removes its tracked cloud test files.
7. Keep bookings closed until an admin deliberately opens them. Opening bookings
   does not send any emails and does not introduce payments.

There are no automatic startup migrations. `server/seed.ts`, the ENABLE_SEED
setting, `server/index.ts` and database connection selection were not changed.

## Storage and access

- New listing images: Replit App Storage, keys
  `listing-photos/<random UUID>/{1600,800,400}.webp`.
- Original upload bytes are processed in memory. Only resized WebP variants are
  written to object storage; EXIF, ICC and XMP metadata are not retained.
- Public image URLs are `/api/listing-images/<photo id>/<width>.webp`. The
  handler checks listing visibility. Owners/admins can preview their drafts.
- Reordering changes the cover. Deleting an uploaded photo removes all three
  variants. Duplicating a listing gives its uploaded images independent keys so
  deleting the original cannot delete the copy's files.
- Existing shared/static photos remain in their original locations.
- Private vendor verification documents remain in their existing private
  PostgreSQL bytea storage and admin-only routes, unchanged. They are not moved
  into the public-photo store.
- Real cloud storage readiness probe: **blocked**, no default bucket configured.

## Verification

- `npm run check -- --pretty false`: pass.
- `npm run build`: pass.
- `NODE_ENV=development npx tsx script/test-pricing.ts`: 14 scenarios pass.
- Onboarding HTTP/database checks: password enforcement, all temporary issuance
  paths, demo visibility, closed bookings, waiting list, upload validation,
  resize/metadata removal, ownership, cover/reorder and deletion pass.
- Uploaded-photo duplication: pass. Copy uses independent keys; deleting the
  original leaves the copy's variants intact, and deleting the copy removes them.
- Responsive screenshot capture: pass at 1440px and 375px. Twelve screenshots
  cover the five requested screens and the Notify me dialog. No horizontal
  overflow or JavaScript page errors were detected. The password form was
  submitted successfully in both viewport runs.
- Live cloud bucket upload/read/delete: **not verified**, blocked as above.

All integration fixtures use disposable development schemas with transaction-local
schema scoping. They do not create test members, vendors, listings or bookings in
the normal development tables. Cleanup is confirmed: zero disposable
`pricing_test_*` schemas remain. The development settings are demo content on
and bookings closed.

### Required test results

| Test | Result |
| --- | --- |
| Temporary-password account cannot call other APIs | Pass: auth/me, public config/listings, member bookings, admin and vendor APIs return the password-change 403; POST booking is blocked too. |
| Same or short new password refused | Pass. Valid change clears the flag and new-password login works. |
| Application approval, admin-created vendor/admin, admin reset | Pass: each newly issued temporary credential is flagged. |
| Non-image renamed to .jpg | Pass: rejected with 400. |
| Valid image over 11MB | Pass: rejected with 400. |
| Uploaded metadata removed | Pass: all three WebPs have the requested widths and no EXIF, ICC or XMP. |
| Demo off | Pass: public listing, slots, photos and Surprise return 404; discovery windows, featured and bucket list exclude it; admin still sees Demo. |
| Booking a hidden demo listing | Pass: server rejects it even while bookings are otherwise open. |
| Bookings closed | Pass: server rejects request with 403 without consuming capacity; discovery remains available. |
| Notify me deduplication | Pass: mixed-case/trimmed variants create one email/listing row; admin-only list and CSV are checked. |
| Live cloud object storage | Blocked: project has no default App Storage bucket. Not claimed as passing. |

## Decisions and assumptions

- Historic temporary credentials cannot be reliably identified from password
  hashes. Existing accounts were not guessed or bulk-locked. The flag is applied
  to every new temporary password issued by approval, admin creation or reset.
  An owner can separately flag any known outstanding historic temporary accounts.
- Photo limit is decimal 10MB and six total gallery items, including any retained
  legacy cover. Animated inputs and images over 40 million pixels are rejected
  for safety. Upload processing is sequential to bound memory consumption.
- There is no payment gateway or email sending in this stage.
- Vendor offline status retains its own "Not taking bookings right now" message
  and server booking restriction.
- Storage/SQL failures cannot be atomic across the two services. Uploads attempt
  cleanup and failed operations report an error; durable reconciliation is
  separate follow-up work.

## Files changed or added

### Server, schema, migration and packages
- `server/routes.ts`
- `server/storage.ts`
- `server/listing-photos.ts`
- `server/onboarding-routes.ts`
- `shared/schema.ts`
- `shared/catalog.ts`
- `migrations/010_vendor_onboarding_gaps.sql`
- `package.json`
- `package-lock.json`

### Client routing, hooks and request helpers
- `client/src/App.tsx`
- `client/src/hooks/use-auth.ts`
- `client/src/hooks/use-site-config.ts`
- `client/src/hooks/use-notify.ts`
- `client/src/lib/queryClient.ts`
- `client/src/lib/vendor-listings.ts`

### Client pages
- `client/src/pages/login.tsx`
- `client/src/pages/set-password.tsx`
- `client/src/pages/set-password.css`
- `client/src/pages/experience-detail.tsx`
- `client/src/pages/legal.tsx`
- `client/src/pages/vendor/listing-editor.tsx`
- `client/src/pages/admin/console.tsx`
- `client/src/pages/admin/listings.tsx`
- `client/src/pages/admin/vendors.tsx`
- `client/src/pages/admin/members.tsx`
- `client/src/pages/admin/settings.tsx`
- `client/src/pages/admin/pricing-settings.css`
- `client/src/pages/admin/waiting-list.tsx`
- `client/src/pages/admin/waiting-list.css`

### Client components and styles
- `client/src/components/experience-card.tsx`
- `client/src/components/activity-card.css`
- `client/src/components/activity-session-panel.tsx`
- `client/src/components/activity-detail-stage-three.css`
- `client/src/components/vendor-application-form.tsx`
- `client/src/components/vendor-pitch-stage-four.css`
- `client/src/components/listing-photo-editor.tsx`
- `client/src/components/listing-photo-editor.css`
- `client/src/components/public-photo-gallery.tsx`
- `client/src/components/public-photo-gallery.css`
- `client/src/components/notify-dialog.tsx`
- `client/src/components/notify-dialog.css`

### Verification, documentation and generated-output exclusions
- `script/test-onboarding.ts`
- `script/capture-onboarding.cjs`
- `script/test-pricing.ts`
- `docs/decisions/010-onboarding-controls-and-public-photos.md`
- `docs/specs/010-vendor-onboarding-gaps/spec.md`
- `docs/specs/010-vendor-onboarding-gaps/design.md`
- `docs/specs/010-vendor-onboarding-gaps/tasks.md`
- `docs/specs/010-vendor-onboarding-gaps/verification.md`
- `.agents/memory/verification-privacy.md`
- `.gitignore`
- `.replitignore`

Generated screenshots and the self-contained screenshot report are under
`generated-artifacts/stage-three/`, excluded from Git and publishing.
