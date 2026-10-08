# Stage 2 delivery and verification

Verified in the development workspace on 8 October 2026. Nothing published.

## Every file changed

Application:
- `client/src/App.tsx` — canonical activity route and legacy redirect.
- `client/src/pages/home.tsx` — Stage 2 homepage.
- `client/src/components/experience-card.tsx` — shared session-backed card and save/remove.
- `client/src/components/activity-card.css` — isolated shared-card styling.
- `client/src/components/homepage.css` — isolated homepage/dialog styling.
- `client/src/hooks/use-homepage-discovery.ts` — existing search, featured and Surprise APIs.
- `client/src/lib/discovery.ts` — Sri Lanka time chips, headings, filters, duration and local nearest-city calculation.

Documentation and verification:
- `docs/specs/002-homepage-activity-card/spec.md` — approved user specification.
- `docs/specs/002-homepage-activity-card/design.md` — implementation boundaries.
- `docs/specs/002-homepage-activity-card/tasks.md` — completion checklist.
- `docs/specs/002-homepage-activity-card/verification.md` — this report.
- `docs/decisions/0002-session-backed-discovery.md` — rationale for real-session discovery.
- `script/test-stage-two.ts` — pure helper assertions.
- `script/verify-stage-two.cjs` — development-only Chromium checks.
- `.agents/memory/MEMORY.md` — updated existing verification-topic pointer.
- `.agents/memory/verification-tooling.md` — browser-automation timing lesson.

Server, shared catalog/schema, database selection, seed code/flag, Stage 1
header/footer/styles and existing detail-page file were not modified.
No package installed or deployment, migration or production operation performed.

## Checks actually performed

- `npm run check`, `npm run build`, and `git diff --check`: passed on final application code.
- Protected-file diff check: no changes to server/shared/header/footer/Stage 1 styles/detail page.
- 21 helper assertions passed with both `TZ=UTC` and `TZ=Pacific/Honolulu`.
  Covers `Starts in 35 min`, `Today 4 PM`, `Tonight 7:30 PM`, `Sat 10 AM`,
  past/full/no-session suppression, Sri Lanka day rollover, duration, grammar,
  date-versus-time parameters and local nearest-city calculation.
- Full Chromium run passed against the development app at 390, 1280 and 320px:
  first physical tap on default Show ideas, real API responses, count headings,
  all four group sizes, Tonight, Weekend, a date and Kandy. No document-wide
  overflow; phone hero at most 55% of viewport and first city field above fold.
- Controlled browser responses covered singular and empty headings, same-city
  no-window fallback, Any city and Try Weekend, Surprise match/404/exclusion,
  approximately 600ms minimum shuffle, deduplicated soonest-first featured cards,
  maximum two image badges, whole LKR and suppression of supplied fake ratings,
  review counts and discounts. Fixtures were intercepted in Chromium only,
  not inserted into the database.
- After final styling/loading refinements, the fixture/authenticated subset passed again:
  grey skeletons, Show ideas while loading, plain HTTP 500 error without an
  invented zero count, successful Retry, and reduced-motion reveal without
  the shuffle delay.
- Simulated geolocation refusal showed the requested message and focused the
  city input. Simulated coordinates selected Colombo locally. No coordinates
  appeared in outgoing API URLs; location is requested only on button click.
- Real demo-member authentication verified device-saved city prefill and real
  card save/remove on the existing Search page. The original favorite list was
  restored. Guest heart redirected to login; legacy experience URL redirected
  to the unchanged activity detail page. No uncaught browser exceptions.
- Public preview screenshots inspected at 390px and 1280px. Expected guest
  `/api/auth/me` 401 is not an application crash.

## Incomplete, assumed or existing issues

- **Accessibility conflict:** white text on exactly `#FF6B24` selected pills is
  approximately 2.85:1, below AA. Orange-on-white highlighted text has the same
  contrast. Kept the explicitly requested colors; cannot claim complete WCAG
  AA compliance without resolving this specification conflict.
- Physical-device location permissions were not tested; refusal/success were
  browser-emulated. Device city prefill uses the currently signed-in user's
  Stage 1 local setting, not another user's device setting.
- Reused images as requested; no new licensed photograph sourced.
- Existing Surprise endpoint returns the excluded item when it is its only
  match. Client treats that response as no alternative. Backend untouched.
- Existing detail page remains unchanged, including any legacy presentation
  there. Stage 2 replaces the shared card, not the detail page.
- Existing build warnings remain: stale Browserslist data, PostCSS `from` option,
  and a large client bundle. No unrelated fixes made.
- One development workflow restart used the existing seed configuration and
  logged `Database already seeded, skipping...`; seed code/flag were not changed.
  No statement about the production seed setting is made.
