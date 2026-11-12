# 017 Responsive activity photos: verification

Spec: `./spec.md`

## Summary for Sudeshi

Activity photos now use smaller copies appropriate to where they appear, without
replacing their subjects, crops, captions or layouts. This covers cards, activity
galleries, For vendors, the shared listing editor and photo picker, My Bookings,
vendor listing thumbnails and the admin listing thumbnails found during the audit.
All originals remain available. Uploaded photos continue using their existing
protected image URLs and stored variants.

On a 375px screen at normal pixel density, full-scroll image downloads fell by
97.1% on home, 95.5% on For vendors and 97.7% in the populated listing editor.
No new migration, secret, bucket or production setting is required.

## Acceptance criteria

| Criterion | How verified | Result |
|---|---|---|
| AC1 | 42 derivative files inspected with sharp; network audit for all 12 route/viewport/DPR cases requests no original curated PNG | Pass |
| AC2 | Before/after screenshots at 375/1440 and DPR 1/2; automated equality of image subjects/order and every rendered width/height; visual review of vendor hero and picker | Pass |
| AC3 | Browser fixture tests supplied uploaded srcsets unchanged and derives existing cover variants; onboarding regression exercises real image handlers using an in-memory object adapter | Pass |
| AC4 | Detail gallery eager/high priority; first vendor hero row eager/high; other shared photos lazy; intrinsic dimensions and existing fixed-aspect containers retained; lazy request deferred until scroll in browser test | Pass |
| AC5 | Failing supplied srcset switches to decoded responsive fallback, only one failed candidate request; changing source identity succeeds, tested at DPR 1/2 | Pass |
| AC6 | Real authenticated vendor/admin editor and vendor list at 375/1440; picker updates preview without saving. Gallery/member booking/heart browser fixtures, plus logged-out heart redirect, pass. Initial fixture side effect disclosed below | Pass, with test-isolation deviation |
| AC7 | Before captured before implementation; same existing listing, artwork, roles, widths, DPR, cache and scroll protocol. Actual response-body bytes, counts and largest response below | Pass |
| AC8 | Typecheck, build, asset/browser tests, onboarding regression and scope audit pass | Pass |

## Commands and evidence

| Command | Result |
|---|---|
| `npx tsx script/generate-activity-photos.ts` | Pass: 14 originals, 42 static derivatives; 4,766,040 bytes combined |
| `node script/test-activity-photos.cjs` | Pass: all 42 files' type, width, aspect and stripped metadata; DPR 1/2 source choice, uploaded variants, explicit srcset, finite fallback, source change and lazy loading |
| `node script/verify-activity-photo-surfaces.cjs` | Pass: vendor picker/preview/list and shared admin editor at 375/1440; member booking thumbnail/detail, card heart/navigation, gallery selection and logged-out redirect |
| `node script/measure-activity-photos.cjs before` | Pass: 12 cold-cache cases, screenshots and image responses |
| `node script/measure-activity-photos.cjs after` | Pass: 12 comparable cases; For vendors refreshed separately after thumbnail sizing refinement |
| `node script/measure-activity-photos.cjs after /for-vendors` | Pass: refreshed all 4 vendor-page cases, preserving other final results |
| `node script/report-activity-photos.cjs` | Pass: all 12 cases preserve image subjects/order/rendered dimensions, no failed image responses, original PNG requests, uncaught browser errors or byte regressions |
| `NODE_ENV=development npx tsx script/test-onboarding.ts` | Pass after repairing the isolated fixture's missing session table; real cloud bucket not exercised |
| `npm run check` | Pass |
| `npm run build` | Pass; existing Browserslist, PostCSS and large-chunk warnings remain |
| `npm run db:status` | Pass: 007, 009, 010, 011, 012, 013 applied; none pending |
| `git diff --check` | Pass |

Browser results/screenshots are under `generated-artifacts/responsive-photos/`,
ignored by Git and deployment. The downloadable `download-report.csv` includes
every initial/full-scroll response total, request count and largest image.

## Measurement method

- Development preview with Chromium, 900px viewport height, widths 375 and 1440,
  DPR 1 and 2. Fresh browser context per case, cache disabled through CDP,
  service workers blocked, reduced motion enabled.
- Home/For vendors logged out. Listing editor used the existing populated demo
  vendor listing `/vendor/listings/16`, without saving.
- Initial totals after navigation/network idle and settling. Full totals after
  incremental 650px scrolls through the page, allowing native lazy loading.
- Bytes are actual **image response-body bytes**, not wire-transfer estimates
  or a sum of files on disk. Include logos and the unchanged global homepage
  hero preload even when that preload is not displayed on the current route.
  HTML, scripts, styles, API JSON and fonts are excluded.
- Every corresponding image retains its source subject, order and rendered
  dimensions. Same listing and photo dataset; API timing may vary, and initial
  lazy-loading timing depends on Chromium's native threshold. No claim of
  absolute page-load-time or production bandwidth measurements is made.

### Initial viewport

All sizes below are exact bytes.

| Page | Width / DPR | Before | After | Saved | Requests before/after | Largest before / after (bytes) |
|---|---|---:|---:|---:|---|---|
| Home | 375 / 1 | 9703210 | 342350 | 96.5% | 9/9 | rafting.png (2441425) / hero-sunset-768.webp (113302) |
| For vendors | 375 / 1 | 6002391 | 269278 | 95.5% | 7/7 | rafting.png (2441425) / hero-sunset-768.webp (113302) |
| Editor | 375 / 1 | 13069243 | 371882 | 97.2% | 9/9 | golf.png (2045843) / hero-sunset-768.webp (113302) |
| Home | 1440 / 1 | 17132771 | 565976 | 96.7% | 13/13 | rafting.png (2441425) / hero-sunset-1440.webp (181986) |
| For vendors | 1440 / 1 | 6072969 | 339856 | 94.4% | 7/7 | rafting.png (2441425) / hero-sunset-1440.webp (181986) |
| Editor | 1440 / 1 | 22434476 | 581126 | 97.4% | 14/14 | rafting.png (2441425) / hero-sunset-1440.webp (181986) |
| Home | 375 / 2 | 9749440 | 738786 | 92.4% | 9/9 | rafting.png (2441425) / rafting-800.webp (164132) |
| For vendors | 375 / 2 | 6048621 | 315508 | 94.8% | 7/7 | rafting.png (2441425) / hero-sunset-768.webp (113302) |
| Editor | 375 / 2 | 13078999 | 500758 | 96.2% | 9/10 | golf.png (2045843) / recreation-800.webp (119120) |
| Home | 1440 / 2 | 17368471 | 1454390 | 91.6% | 13/13 | rafting.png (2441425) / hero-sunset-2400.webp (313218) |
| For vendors | 1440 / 2 | 6308669 | 790698 | 87.5% | 7/7 | rafting.png (2441425) / hero-sunset-2400.webp (313218) |
| Editor | 1440 / 2 | 22578528 | 1539802 | 93.2% | 14/14 | rafting.png (2441425) / hero-sunset-2400.webp (313218) |

### Full scroll

| Page | Width / DPR | Before | After | Saved | Requests before/after | Largest before / after (bytes) |
|---|---|---:|---:|---:|---|---|
| Home | 375 / 1 | 17062193 | 495398 | 97.1% | 13/13 | rafting.png (2441425) / hero-sunset-768.webp (113302) |
| For vendors | 375 / 1 | 6002391 | 269278 | 95.5% | 7/7 | rafting.png (2441425) / hero-sunset-768.webp (113302) |
| Editor | 375 / 1 | 22363898 | 510548 | 97.7% | 14/14 | rafting.png (2441425) / hero-sunset-768.webp (113302) |
| Home | 1440 / 1 | 17132771 | 927972 | 94.6% | 13/14 | rafting.png (2441425) / rafting-1600.webp (361996) |
| For vendors | 1440 / 1 | 6072969 | 339856 | 94.4% | 7/7 | rafting.png (2441425) / hero-sunset-1440.webp (181986) |
| Editor | 1440 / 1 | 22434476 | 581126 | 97.4% | 14/14 | rafting.png (2441425) / hero-sunset-1440.webp (181986) |
| Home | 375 / 2 | 17108423 | 1194342 | 93.0% | 13/13 | rafting.png (2441425) / rafting-800.webp (164132) |
| For vendors | 375 / 2 | 6048621 | 315508 | 94.8% | 7/7 | rafting.png (2441425) / hero-sunset-768.webp (113302) |
| Editor | 375 / 2 | 22373654 | 639424 | 97.1% | 14/15 | rafting.png (2441425) / recreation-800.webp (119120) |
| Home | 1440 / 2 | 17368471 | 1816386 | 89.5% | 13/14 | rafting.png (2441425) / rafting-1600.webp (361996) |
| For vendors | 1440 / 2 | 6308669 | 834976 | 86.8% | 7/8 | rafting.png (2441425) / hero-sunset-2400.webp (313218) |
| Editor | 1440 / 2 | 22578528 | 1539802 | 93.2% | 14/14 | rafting.png (2441425) / hero-sunset-2400.webp (313218) |

Some cases request one extra image: the same artwork appears at multiple sizes,
so Chromium requests a small thumbnail and a larger card/CTA candidate instead
of sharing one huge original everywhere. Inspected response lists confirm these
are successful responsive variants, not retries. Total bytes still fall in every
case. No original PNG is requested on the successful measured paths.

## Database and production

- No new or edited migration, schema, backend route, storage operation or setting.
- No change to `server/seed.ts`, ENABLE_SEED, database selection or photo buckets.
- Regression test data stayed in disposable DEV schemas, removed in cleanup.
- No live listing was saved; before/after GET response equality verified for the
  editor test listing. No production data was read or changed.
- No new secrets, dependencies, manual production step or publish.

## Changed files

Client:
- `client/src/components/activity-photo.tsx`
- `client/src/lib/activity-photos.ts`
- `client/src/lib/curated-photos.json`
- `client/src/components/experience-card.tsx`
- `client/src/components/public-photo-gallery.tsx`
- `client/src/components/listing-photo-editor.tsx`
- `client/src/pages/home.tsx`
- `client/src/pages/for-vendors.tsx`
- `client/src/pages/my-bookings.tsx`
- `client/src/pages/vendor/listing-editor.tsx`
- `client/src/pages/vendor/listings.tsx`
- `client/src/pages/admin/listings.tsx`
- `client/src/pages/admin/vendor-detail.tsx`

Static assets: `client/public/images/responsive/{name}-{400,800,1600}.webp`
for arcade, billiards, cooking, darts, golf, pottery, rafting, recreation, spa,
surfing, volleyball, yoga, fallback and hero-bg. All 42 are committed; originals
are not changed.

Scripts:
- `script/generate-activity-photos.ts`
- `script/measure-activity-photos.cjs`
- `script/test-activity-photos.cjs`
- `script/verify-activity-photo-surfaces.cjs`
- `script/report-activity-photos.cjs`
- `script/test-onboarding.ts` (isolated session fixture only)

Docs/memory:
- `docs/specs/017-responsive-activity-photos/{spec,design,tasks,verification}.md`
- `docs/context/{tech,architecture}.md`
- `docs/context/profiles/react.md`
- `.agents/memory/{MEMORY,verification-tooling,responsive-photo-decisions}.md`

## Assumptions, deviations and limitations

- Quality 85 WebP is visually equivalent at the intended display size, not
  lossless. Never upscale the native 1024/1280/1408px sources to reach 1600.
  Manifest descriptors reflect actual widths. Sports/home hero keep their
  previously optimised special variants/picture markup unchanged.
- No new page design, crop, text or palette changes. Private verification documents,
  authentication/ownership and upload/reorder/delete implementation are unchanged.
- Existing upload guards/order/delete/metadata tested with the existing in-memory
  object adapter, not the live cloud bucket. Browser gallery/member booking rows
  and favorite state use clearly synthetic intercepted fixtures.
- The initial existing onboarding test failed login because its isolated schema
  lacked the now migration-managed session table. Added application of unchanged
  migration 013 inside that fixture, then the complete suite passed.
- One early favorite test collection mock missed the item DELETE URL. The DEV
  server received a DELETE and returned 200; whether a pre-existing demo saved item
  was removed cannot be established from that response. No speculative restoration
  was made. The final test blocks non-read browser API requests by default and
  explicitly intercepts both collection and item favorites paths. No listing or
  production data was changed by that test.
- An initial long-running UI attempt was stopped, then bounded waits added.
  Tall picker screenshots were changed to scroll/decode lazy tiles before capture.
  These are test corrections, not product behaviour changes.
- A pre-existing global home-hero preload still downloads the hero on non-home
  routes. It is included in all reported totals and left unchanged by scope.
- No physical-device Safari/Firefox testing or production speed measurement.
  Browser tests use installed Chromium. Existing build warnings were not changed.

Ready to publish: Yes
