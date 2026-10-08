# Stage 3 verification and change report

## Delivered

- URL-backed Explore city/group/time/date/category filters, browser-only whole-LKR
  price bounds and sorting, 24-card pagination and phone draft/apply filter sheet.
- Public detail with factual metadata and one existing photo; shared activity
  cards for related results; grouped future Sri Lanka sessions, seven date groups
  initially, real remaining availability and group-aware selection/Next session.
- Sticky desktop booking panel and phone price bar/session sheet, whole-LKR
  quantity calculation, three-step request and auth-return preservation.
- Only four booking inputs are sent; the existing server still computes the total.
- 409 refreshes sessions and clears selection; 401 returns to identity/login
  without dropping the chosen session/group.
- Confirmed-only member-booking address/contact projection and corresponding
  My bookings panel. Non-confirmed phone/email/location/city are null.
- Shared support email is hello@freespirit.club; guest-booking UI setting is OFF.

## Tests actually performed

1. `npm run check`: passed.
2. `npm run build`: passed. Existing Browserslist, PostCSS `from`, and large-chunk
   warnings remain; no packages or toolchain settings were changed.
3. `git diff --check`: passed.
4. `npx tsx script/test-stage-three.ts`: passed. Pure Sri Lanka date/session,
   group-capacity, closed/full/almost-full rules and support/guest settings.
   In an isolated process, a stubbed read builder tested all five booking statuses:
   contacts/location only for confirmed and no customer contact leakage. No SQL
   was executed by that projection test.
5. `node script/verify-stage-three.cjs --create-booking`: passed:
   - Published Pool & Billiards and non-existent-activity 404 at 390/1280px;
     visible human dates, initially at most seven date groups, no rating/review UI.
   - Browser-only fixtures: 30 results, initial 24/load more, price sorting and
     browser price bounds, URL filters and phone draft/apply sheet.
   - Browser-only future-slot fixtures: Full/Almost full/normal counts,
     fewer-spots-than-group disabled, group-aware Next session and more dates.
   - Real demo-member login returns to selected session/group; guest UI absent.
   - UI 409 fixture shows the friendly message, closes the request and refreshes
     slots. Separately, a real over-capacity POST returned 409 without a booking.
   - Real own-bookings response ignores a spoofed customer query, contains only
     the current member's bookings and hides non-confirmed contact fields.
   - Real logout during review causes 401 recovery; login preserves selection.
   - Browser-only member fixtures: requested hides contacts; confirmed renders
     address/tel/email at 320/390/1280px.
   - A real two-person request reached Sent, sent exactly experienceId/slotId/qty/
     customerNote, used the server-computed whole-LKR total, and appeared as
     Requested in My bookings. This labelled test request remains in DEV.
6. Signup/save assertions in an additional browser run passed: a new member
   returned to the chosen session/group after signup, and save/remove were
   verified through the real favorites API. The later native-share portion of
   that run did not complete in headless Chromium. One synthetic test member
   named “Stage 3 browser verification” remains in DEV; no second account was
   created to retry sharing.
7. `node script/verify-stage-three.cjs --share-only`: passed. Actual clipboard
   write/read and success toast with native sharing disabled in that test browser;
   guest-heart login return and both login/signup cross-links preserve choices.
   Final Explore, phone filter sheets and session panels had no horizontal
   overflow at 320/390/1280px.
8. Public preview screenshots reviewed: desktop Explore and phone Pool &
   Billiards. Authenticated/interactive states were checked with the separate
   browser harness, not the unauthenticated screenshot tool.

## Assumptions, limitations and existing issues

- The slots API's capacity field is remaining inventory, not activity capacity.
  Closed slots with nonzero inventory are labelled Unavailable, not falsely Full.
- The existing public activity API exposes one image; no gallery was fabricated.
- Native operating-system share sheets were not device-tested. Clipboard
  fallback was tested, with that branch explicitly selected in the test browser.
- Existing My bookings refresh behavior was kept; vendor status changes may
  require a page refresh. This stage does not add live booking-status polling.
- The existing booking API has a maximum quantity of 500; that server validation
  was not changed. Current tested activities have smaller capacities.
- Guest sending/server support is intentionally absent, as requested. The shared
  OFF setting controls prototype fields only; anonymous Send request is disabled.
- The support mailbox is knowingly not live yet.
- No publication, production database access, schema changes, db:push, package
  installations, secret/environment changes, or new backend routes.
- Protected seed/startup/database-connection/schema files are unchanged, as are
  the Stage 1 header/footer and Stage 2 homepage/shared activity card.

## Every changed file

### Application
- `shared/catalog.ts` — support email and OFF guest UI setting.
- `server/storage.ts` — confirmed-only own-bookings contact/address projection.
- `client/src/pages/search.tsx` — Explore filters/results.
- `client/src/pages/experience-detail.tsx` — activity detail.
- `client/src/pages/my-bookings.tsx` — confirmed contacts.
- `client/src/pages/login.tsx` — preserve next when switching to signup.
- `client/src/pages/signup.tsx` — honor next and preserve it when switching to login.
- `client/src/hooks/use-activity-booking.ts` — shared detail/session/favorite state.
- `client/src/lib/activity-sessions.ts` — Sri Lanka grouping/bookability/labels.
- `client/src/components/activity-session-panel.tsx` — desktop/mobile sessions.
- `client/src/components/booking-request-dialog.tsx` — identity/review/sent request.
- `client/src/components/activity-detail-stage-three.css` — detail/session styles.
- `client/src/components/booking-request-stage-three.css` — request dialog styles.
- `client/src/components/search-stage-three.css` — Explore/sheet styles.

### Tests and documentation
- `script/test-stage-three.ts`
- `script/verify-stage-three.cjs`
- `docs/specs/003-explore-detail-booking/spec.md`
- `docs/specs/003-explore-detail-booking/design.md`
- `docs/specs/003-explore-detail-booking/tasks.md`
- `docs/specs/003-explore-detail-booking/verification.md`
- `docs/decisions/0003-booking-choice-and-contact-boundary.md`
- `.agents/memory/verification-tooling.md`
