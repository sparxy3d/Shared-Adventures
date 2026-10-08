# Stage 5 delivery and verification — 8 October 2026

## Delivered

- Listings, five-section editor with the shared activity-card preview, draft
  duplication, photo/session publication checks, and admin-unpublished status lock.
- Per-listing browser patterns, tomorrow-onward 60-day insert-only generation,
  calendar, one-off sessions, close-day and protected single-session deletion.
- Real booking statistics, six-month picker, confirmed/completed weekly chart,
  listing totals and the page-views-coming-soon footnote.
- Business profile, preserved application text/terms, password change and logout.
- Old experience/editor/availability routes redirect to the new routes; the old
  source files remain unimported rather than being deleted.

## Tests actually performed

### Isolated checks

`npx tsx script/test-stage-five.ts` passed:

- Tomorrow/60-day bounds in Sri Lanka, Saturday/Sunday pattern selection,
  duplicated pattern entries, 90-minute durations and midnight rollover.
- Role and ownership refusal, invalid day count/weekday/time/capacity/price/title.
- Admin-only unpublished status; blocked vendor status changes while details remain editable.
- Past/booked session deletion refusal.
- Nested parentheses in the recorded vendor-terms version and verbatim application block.

Fixtures prohibit SQL; these tests do not prove real database transactions.

### Real development API

`node script/verify-stage-five-api.cjs --listing=13` completed successfully after
resuming its labelled fixture. Initial fresh-fixture checks also verified a draft
with no photo and publication refusal without an upcoming session.

- LKR 2,500 remains stored as 2500.
- Saturday/Sunday 10:00/14:00 generation; existing rows unchanged on repeat.
- Correct 90-minute generated end times.
- Published activity available through public detail, Weekend and Tonight search.
- Two-person requested booking reserves spots; deletion returns 409.
- Close-day removes unbooked sessions while retaining the booked session.
- Empty-session deletion succeeds.
- Real vendor2 receives 404 for vendor1 listing read/update, slots read/create,
  generation, close-day and single-slot deletion.
- Admin unpublishing succeeds; vendor draft/published transitions return 403,
  ordinary detail edits still succeed and public detail becomes 404.
- Profile persistence and password change/new-password login.

The browser subsequently deleted the now-declined test booking's empty session
and verified that the booking survived with its date/start snapshot and null slot link.

### Authenticated Chromium

Used the installed Chromium and existing ws package, not an auth bypass or a new
application dependency. Mutation scenarios were run in stages/resumed against the
same labelled listing, rather than creating another listing after each test timeout.

Verified:

- Native pointer activation of the phone Save draft button, unobstructed by bottom tabs.
- Real draft creation with price 2500, capacity 12 and duration 90.
- Publication disabled before sessions, with a Schedule link.
- Saturday/Sunday 10:00/14:00, capacity 12; device pattern storage and real generation.
- Phone-visible Live status after publishing and successful public detail response.
- Duplicate creates one separate draft without copying sessions.
- Business profile form save, password form submission and login with the new password.
- Listings, new editor, Schedule, Stats and Profile at **320, 390 and 1280 pixels**:
  all 15 rendered-page checks passed without horizontal page overflow.
- Monthly request/confirmed counts compared with the real vendor bookings response;
  six month options and page-view footnote.
- Same-page editor anchors retain edits without a leave prompt; leaving opens a
  confirmation; Keep editing and Leave page both work.

Final targeted command:
`node script/verify-stage-five-browser.cjs --layout-only --assert-only` passed.
The full matrix was checked separately with `--layout-only`; an outdated footnote
assertion failed after those 15 layout checks, then the exact requested footnote
and final assertion pass were completed. This is not a claim that the entire
mutation-plus-layout script passed in one uninterrupted run.

Signed-in screenshots were inspected, including phone editor/stats and desktop
schedule. The standard preview screenshot correctly rendered login for the
unauthenticated vendor route; authenticated rendering was verified separately.

### Build and protected scope

- `npm run check` passed.
- `npm run build` passed.
- `git diff --check` passed.
- Protected-file diff check passed: seed, startup, database connection and shared
  schema files are unchanged.
- Development workflow is running. No publishing action was performed.

## Assumptions, deliberate shortcuts and limitations

- Monthly statistics use requests **received** in the selected Sri Lanka month.
  Confirmed counts/value include completed bookings; the weekly chart uses that
  received-date cohort, with Monday–Sunday weeks clipped to the month.
- Slot capacity is remaining inventory. Total session capacity is inferred from
  remaining spots plus requested/confirmed quantities; no new capacity column.
- The editor requires title/category/city before draft save; other sections,
  including photo and sessions, can be completed later.
- Weekly patterns exist on this device only. Generation does not replace sessions.
  Since closure deletes slots without storing a closed-date record, regenerating
  the pattern can recreate removed unbooked sessions; the UI explains this.
- Website/application details and recorded terms remain read-only. Logo/photo
  upload, promo video, notifications and page views remain the requested go-live
  placeholders. No new infrastructure or schema support was added.
- Three labelled development listings remain: the API fixture is admin-unpublished,
  the UI fixture and its copy are drafts. Generated development sessions and one
  declined test booking remain. Reservations were released; the demo password
  and original business description were restored.
- Error/empty/loading UI exists and was source-reviewed. Network failures,
  storage quota failures, every keyboard focus path and a full WCAG audit were
  not systematically exercised.
- Two existing edge cases were noticed and left outside this stage: reservation
  and booking creation are separate operations, leaving a race against deletion;
  the reused one-off endpoint caps overnight end times at 23:59. Generated-session
  midnight rollover is tested and works.
- Existing Browserslist, PostCSS and bundle-size warnings remain; no unrelated
  dependency or toolchain changes were made.

## Every changed file

Application:

1. `client/src/App.tsx`
2. `client/src/components/vendor-shell.tsx`
3. `client/src/components/vendor-editor-stage-five.css`
4. `client/src/components/vendor-schedule-stage-five.css`
5. `client/src/lib/vendor-listings.ts`
6. `client/src/lib/vendor-schedule.ts`
7. `client/src/pages/vendor/listings.tsx`
8. `client/src/pages/vendor/listing-editor.tsx`
9. `client/src/pages/vendor/schedule.tsx`
10. `client/src/pages/vendor/stats.tsx`
11. `client/src/pages/vendor/business-profile.tsx`
12. `server/routes.ts`
13. `server/storage.ts`
14. `server/vendor-session-plan.ts`

Tests:

15. `script/test-stage-five.ts`
16. `script/verify-stage-five-api.cjs`
17. `script/verify-stage-five-browser.cjs`

Required specification/decision/report documents:

18. `docs/specs/005-vendor-listing-operations/spec.md`
19. `docs/specs/005-vendor-listing-operations/design.md`
20. `docs/specs/005-vendor-listing-operations/tasks.md`
21. `docs/specs/005-vendor-listing-operations/verification.md`
22. `docs/decisions/0005-device-pattern-and-session-safety.md`

Durable project lessons/decisions:

23. `.agents/memory/MEMORY.md`
24. `.agents/memory/verification-tooling.md`
25. `.agents/memory/vendor-onboarding.md`
