# Stage 4 delivery and verification

Verified on 8 October 2026 in the running development workspace. No publishing,
schema migration, package installation, environment change or production query
was performed.

## Delivered

- Public vendor pitch and reusable inline/standalone application, five categories,
  supported cities, field validation, draft terms and shared thank-you wording.
- Anonymous application creates an unusable-password placeholder owner and a
  pending vendor together. Existing email is rejected with the requested message.
  Authenticated non-admin applications retain their existing account linkage.
- Approval promotes the owner and approves the vendor. Only a placeholder owner
  receives a new hashed temporary password, returned once with the login email.
- Vendor role gate, desktop sidebar and mobile navigation; real dashboard
  requests, slot-based/day-grouped bookings, remaining spots and monthly metrics.
- Booking tabs/search, detail, confirmed-only contacts, other session bookings,
  required decline reason/optional note, and confirmed cancellation with native
  confirmation. Success toasts and plain inline errors.
- Vendor login preserves a requested vendor route. This is the only login-page
  change; ordinary landing defaults and other roles are unchanged.
- Schedule and Stats have next-update pages. Existing Listings and Business
  profile pages remain accessible inside the shell; their source is unchanged.

## What was tested, and how

### Static/build checks

- `npm run check` — passes.
- `npm run build` — passes.
- `git diff --check` — passes.
- Checked protected paths: no differences in server startup, seed, database
  connection, schema, package/config files or the old vendor page source.

### Isolated tests

`npx tsx script/test-stage-four.ts` passes. These are explicit fixtures, not
production/database checks; unexpected SQL is rejected by the test process.

- Phone/email null for requested, declined, cancelled and completed; present
  only when confirmed; remaining inventory projected from actual slot fields.
- Member/admin denied vendor operations; cross-vendor booking ownership rejected.
- Required/catalog decline reason, legal transitions and sequential duplicate
  rejection; quantity released once for each accepted decline/cancellation.
- Human dates/times, missing received-time fallback and same-day Sri Lanka-time
  Upcoming/Past classification.

### Real development API/database checks

`script/verify-stage-four-api.cjs` exercised:

- New anonymous application/address/description metadata/dated terms; unusable
  placeholder login; duplicate-email message; malformed fields and anonymous guard.
- Admin approval, login with the returned temporary credential, owner promotion,
  repeat approval without a password, and unchanged ordinary-owner password.
- Two real two-person bookings, confirmation, decline with reason/note and
  cancellation; contact redaction before confirmation; member status/note;
  missing reason/invalid transition and duplicate cancellation rejection.
- The first mutating run stopped at a test-fixture assumption: there was no real
  other-vendor booking available. Ownership was checked by the isolated guarded
  route test instead. Its preceding real mutations/assertions completed.
- `node script/verify-stage-four-api.cjs --read-only` subsequently passes for the
  retained statuses/notes, privacy and dashboard month/checklist/spot fields.

### Browser checks

Installed Chromium, existing `ws` and the browser debugging protocol were used;
no app dependencies or authentication bypass were added.

- Public form: real anonymous submission and exact thank-you; blur validation,
  five category choices, inline-form scroll and real duplicate-email error.
- Member/admin vendor not-allowed screens and logged-out login redirect.
- `--login-return` passes with the actual login form, returning to vendor bookings.
- `--live-actions` passes: two real member requests, vendor UI Confirm, native
  Cancel confirmation and Decline reason/note, followed by real member status/note.
  Contacts are absent before confirmation and visible after confirming. Reserved
  capacity is restored exactly.
- `--fixtures-only` passes for additional action payload, required-reason,
  same-session detail, initial focus and Escape checks. Only that browser's booking
  requests are intercepted; these fixtures do not modify database records.
- `--layout-only` passes for public pitch, loaded vendor dashboard and loaded
  booking list at **320, 390 and 1280 pixels**, with no horizontal page overflow.
  Final primary button text is dark for contrast. Screenshots were captured and
  reviewed, including authenticated vendor screens.
- A long initial combined browser run timed out after its public/role/layout
  assertions and anonymous write; it was not blindly replayed. Subsequent
  targeted modes above pass. Browser runs report no uncaught application errors.
- Public screenshot tool checks also passed. Anonymous `/api/auth/me` returning
  401 is expected, not an app failure.

Browser commands:

```sh
node script/verify-stage-four-browser.cjs --layout-only
node script/verify-stage-four-browser.cjs --login-return
node script/verify-stage-four-browser.cjs --fixtures-only
node script/verify-stage-four-browser.cjs --live-actions
```

The final command writes two labelled development bookings and restores their
reserved spots. `--apply` additionally creates one pending test applicant; do
not repeat it just to recheck layout.

## Development test data retained

Two labelled synthetic application/owner pairs remain: one API-approved and one
browser-pending. Four labelled two-person bookings remain: two Cancelled and two
Declined. All their reservations were released. No generated temporary password
was printed or saved to a report. An existing demo-owner approval was also
exercised, without resetting its password.

## Assumptions, deferred work and other problems

- Monthly requests means all booking requests for sessions in the current Sri
  Lanka calendar month; confirmed count/value includes confirmed and completed.
  Requested and confirmed reservations contribute to session booked quantities.
- Extra application fields remain description metadata; city uses the existing
  region field. These are deliberate no-schema prototype choices.
- Admin approval **API** is tested; the existing admin status dropdown does not
  consume this one-time credential response. Admin console wiring is Stage 6.
- No email, SMS, push alert or payment is sent. Cancellation updates My bookings;
  member status/note was verified on a fresh load, not a cross-browser push.
- The existing status-change helper remains a separate read/update/release.
  Sequential duplicates are rejected, but concurrent transitions are not proven
  atomic. It was not changed beyond this stage's scope.
- Physical-device, screen-reader and full WCAG audits were not performed.
- Existing build warnings remain: outdated Browserslist data, PostCSS `from`
  option warning and a large bundle. No unrelated toolchain changes were made.

## Every file changed for Stage 4

Earlier uncommitted Stage 3 work is not included in this list.

### Application files

1. `client/src/App.tsx` — vendor wrapper/routes and interim pages.
2. `client/src/pages/login.tsx` — scoped vendor return-path handling.
3. `client/src/pages/for-vendors.tsx` — public pitch.
4. `client/src/pages/vendor-apply.tsx` — standalone reusable application.
5. `client/src/components/vendor-application-form.tsx` — form/states/submit.
6. `client/src/components/vendor-pitch-stage-four.css` — scoped public styles.
7. `client/src/components/vendor-shell.tsx` — shell/navigation/logout.
8. `client/src/components/vendor-stage-four.css` — scoped vendor styles.
9. `client/src/components/vendor-booking-actions.tsx` — mutations/decline/cancel.
10. `client/src/lib/vendor-bookings.ts` — types and human/Sri Lanka-time helpers.
11. `client/src/pages/vendor/dashboard.tsx` — dashboard.
12. `client/src/pages/vendor/vendor-bookings.tsx` — booking management/detail.
13. `client/src/pages/vendor/next-update.tsx` — Schedule/Stats interim pages.
14. `shared/catalog.ts` — one application thank-you constant.
15. `server/routes.ts` — application, approval, dashboard and booking contracts.
16. `server/storage.ts` — transactional application/approval and vendor projection.

### Tests, documentation and memory

17. `script/test-stage-four.ts`
18. `script/verify-stage-four-api.cjs`
19. `script/verify-stage-four-browser.cjs`
20. `docs/specs/004-vendor-onboarding-and-bookings/spec.md`
21. `docs/specs/004-vendor-onboarding-and-bookings/design.md`
22. `docs/specs/004-vendor-onboarding-and-bookings/tasks.md`
23. `docs/specs/004-vendor-onboarding-and-bookings/verification.md`
24. `docs/decisions/0004-vendor-application-placeholders.md`
25. `.agents/memory/verification-tooling.md`
