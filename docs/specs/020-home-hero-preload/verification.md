# Verification: 020 Homepage-only hero preload

Category: Small fix (tier 0). Requested directly on 2026-11-13.
No separate feature spec or additional approval required.

## Summary for Sudeshi

Only the homepage requests its hero image early. Opening For vendors or Log in
directly no longer downloads that unused image. The homepage keeps the same
image sizes and high loading priority. Page appearance and navigation are
unchanged. Nothing was published.

## Acceptance criteria

| Criterion | Verification | Result |
|---|---|---|
| Two preload links inserted only when `location.pathname === "/"` | Fresh browser contexts, DOM inspection on all three routes | Pass |
| Same href, media, image source sets, sizes and fetch priority | Source comparison; browser DOM/network selection | Pass |
| Homepage hero fetched at high priority below/above 768px | Chromium CDP Network request and priority events, 375px and 1440px | Pass |
| No hero fetch on fresh `/for-vendors` or `/login` | New context and disabled cache per route/width; zero matching Network events | Pass |
| No CSP blocks inline script | No inline-script CSP violations; root has both dynamic links; document response headers checked | Pass |
| Production-style static output works | Same six cases against built `dist/public`, served by temporary static-only harness | Pass |
| `home.tsx` unchanged | Git diff scope check | Pass |

## Commands run

| Command | Result |
|---|---|
| `npm run check` | Pass |
| `npm run build` | Pass; existing Browserslist/PostCSS/chunk-size warnings |
| `node script/test-home-hero-preload.cjs` | Pass, 12 cases: 2 widths × 3 routes × DEV/built |
| `git diff --check` | Pass |

## Network evidence

Each case used a fresh browser context with cache disabled. CDP Network events
provide the same request and priority data shown in the browser Network panel.
At DPR 1:

| Width | Route | Hero requests (DEV and built) |
|---|---|---|
| 375px | `/` | One `hero-sunset-768.webp`, High priority, reused by rendered hero |
| 375px | `/for-vendors` | Zero |
| 375px | `/login` | Zero |
| 1440px | `/` | One `hero-sunset-1440.webp`, High priority, reused by rendered hero |
| 1440px | `/for-vendors` | Zero |
| 1440px | `/login` | Zero |

Full captured attributes, request priorities, CSP headers and violation results:
`generated-artifacts/hero-preload/network.json` (ignored test output).

## CSP check

No page-level CSP meta tag or application HTML-response policy was found.
DEV and static built document responses have no CSP and no inline-script
violations. Read-only GETs to the currently published `/`, `/for-vendors` and
`/login` each returned 200 with neither Content-Security-Policy nor its report-only
variant. This does not claim the new script is published.

The restrictive CSP on private verification-document downloads in
`server/routes.ts` is specific to those responses, not HTML pages. It was not
changed or weakened. A future restrictive page CSP would need to authorize this
inline script; this test detects it if exercised against that configuration.

## Database and production needs

- No migration, database/seed/ENABLE_SEED changes, new dependencies or secrets.
- No production changes or publishing.
- No manual production configuration needed.
- DEV HTML hot reload applied the change; no workflow/server restart required.
- The built browser harness does not boot the production server or connect to a
  database. Public GET APIs are forwarded to the running DEV workflow; non-read
  requests are refused. No authenticated sessions or form submissions.

## Changed files

- `client/index.html`: replace the two global static image hints with a small
  pathname-conditional inline script creating the same links.
- `script/test-home-hero-preload.cjs`: repeatable fresh-load browser/CDP checks
  for both served DEV and actual built output.
- `docs/context/profiles/react.md`: keep homepage image hints homepage-only.
- `docs/specs/020-home-hero-preload/verification.md`: this report.

## Deviations and follow-ups

No deferred acceptance criteria. No backend changes or CSP relaxation.
`client/src/pages/home.tsx` and all image files remain unchanged.

Ready to publish: Yes
