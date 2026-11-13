# Tech context

Last verified: 2026-10-27 (kit refresh by Claude against `main` at `41e6f9f`, after the
production database move and ADR 013. Reviewed with Madushan.)

What it takes to build, run, release and change this repo.

## Stack

| Layer | Choice | Version (from `package.json`) |
|---|---|---|
| Runtime | Node.js | 20 (`.replit` module `nodejs-20`) |
| Language | TypeScript, `strict: true` | 5.6.3 |
| Server | Express | ^5.0.1 |
| Sessions | express-session with connect-pg-simple (Postgres store, table from migration 013) | ^1.18.1, ^10.0.0 |
| ORM | drizzle-orm, drizzle-zod (drizzle-kit for introspection only) | ^0.39.3, ^0.7.0 |
| Database | PostgreSQL 18 on Neon, project `FREE-SPIRIT` (`small-fire-32869842`), database `free_spirit` | — |
| Migrations | Numbered SQL in `migrations/`, applied by `server/migrations.ts` at start-up | ADR 013 |
| Object storage | Replit App Storage (`@replit/object-storage`) for listing photos, separate DEV and PROD buckets | — |
| Images | sharp (upload resizing to 1600, 800 and 400 px WebP) | — |

Curated activity photos use committed static WebP derivatives and a shared responsive
renderer alongside the existing uploaded variants. Regenerate with
`npx tsx script/generate-activity-photos.ts`; keep originals for compatibility and
rollback. The 1600px target never enlarges a smaller original. See spec 017.
Image regression checks: `node script/test-activity-photos.cjs` and
`node script/verify-activity-photo-surfaces.cjs` (development only; browser fixtures
for member bookings/gallery/favorite interactions, no listing saves).
| Client | React 18, wouter, TanStack Query 5, shadcn/ui on Radix | ^18.3.1, ^3.3.5, ^5.60.5 |
| Styling | Tailwind CSS 3, Plus Jakarta Sans | ^3.4.17 |
| Bundling | Vite 7 for the client, esbuild for the server (`script/build.ts`) | ^7.3.0, ^0.25.0 |
| Validation | zod 3, strict schemas in routes | ^3.24.2 |

`passport`, `passport-local`, `memorystore`, `ws`, `recharts`, and others are installed but
not used by the server code. Do not assume a library is in use because it is in `package.json`.

## Repository layout

```
client/            React SPA (Vite root). src/pages, src/components, src/lib, public/images, public/brand
server/            index.ts (boot: migrations, seed gate, routes), routes.ts, onboarding-routes.ts,
                   listing-photos.ts, vendor-documents.ts, storage.ts (all queries), db.ts,
                   migrations.ts (runner), seed.ts, time.ts, vite.ts, static.ts
shared/            schema.ts (tables and zod schemas), pricing.ts (totals and commission), catalog.ts
migrations/        Numbered SQL files. Immutable once applied anywhere
script/            build.ts, migrate.ts (CLI), test-*.ts integration scripts, capture-*.cjs screenshots
.agents/memory/    Trap notes for agents (index: MEMORY.md)
docs/              This context kit
```

Path aliases: `@/*` is `client/src/*`, and `@shared/*` is `shared/*`.

## Commands

| Purpose | Command | Notes |
|---|---|---|
| Install | `npm ci` | Fails outside Replit. See "Lockfile trap" |
| Typecheck | `npm run check` | Must pass for every change |
| Build | `npm run build` | Client, server bundle, `dist/migrate.cjs`, copies `migrations/` to `dist/migrations` |
| Dev server | `npm run dev` | Replit run button. Applies pending migrations to DEV first |
| Prod server | `npm start` | Deployment only. Never run in the workspace: `NODE_ENV=production` selects the PROD database |
| Migration status | `npm run db:status` | Read-only applied and pending files with SHA-256 |
| Migrate | `npm run db:migrate` | Applies pending files to the selected database (DEV in the workspace) |
| Migration tests | `npm run test:migrations` | After `npm run build`. Disposable DEV schemas |
| Feature tests | `NODE_ENV=development npx tsx script/test-<area>.ts` | pricing, onboarding, multi-activity-applications, vendor-fees. Disposable DEV schemas |
| Lint and format | none | No ESLint or Prettier config |

### Lockfile trap

Three entries in `package-lock.json` (`dotenv`, `cross-env`, `@epic-web/invariant`)
resolve to `http://package-firewall.replit.local/npm/...`, a host that only exists inside
Replit. Outside Replit, `npm ci` fails with E405 or E404. CI rewrites them:

```
sed -i 's#http://package-firewall.replit.local/npm/#https://registry.npmjs.org/#' package-lock.json
```

The permanent fix is a Small fix that commits the rewritten lockfile.

## Configuration

Read from `process.env` at the point of use. There is no config module. Values live in
Replit secrets: workspace secrets for development, deployment secrets for production.
Production must have its own value for every variable marked PROD below.

| Variable | Where it is needed | Purpose |
|---|---|---|
| `NEON_DATABASE_URL_DEV` | Workspace | Neon branch `develop`. Used whenever not in production |
| `NEON_DATABASE_URL_PROD` | Deployment | Neon branch `production`, database `free_spirit`, pooled URL. Selected when `NODE_ENV=production` or `REPLIT_DEPLOYMENT` is set |
| `DATABASE_URL` | Neither, ideally | Fallback when the matching Neon variable is absent. Should not be relied on |
| `LISTING_PHOTOS_BUCKET_DEV` | Workspace | FreeSpiritDevBucket ID. No fallback to the default bucket |
| `LISTING_PHOTOS_BUCKET_PROD` | Deployment | FreeSpiritBucket ID. Uploads fail closed with 503 if missing |
| `SESSION_SECRET` | Both, different values | Cookie signing and application-limiter HMAC keys. Application admission fails closed if absent; legacy session fallback remains known debt |
| `ENABLE_SEED` | Workspace only | `true` runs the demo seed at boot. Must be absent or `false` in the deployment |
| `PORT` | `.replit` | Listen port, default 5000 |
| `NODE_ENV`, `REPLIT_DEPLOYMENT` | Set by scripts and Replit | Select production behaviour and the PROD database and bucket |

`.env` is git-ignored. No `.env.example` exists.

## Environments

| Environment | Where | Database (Neon `small-fire-32869842`) | Photo bucket | Seed |
|---|---|---|---|---|
| Dev | Replit workspace, `npm run dev` | branch `develop` | FreeSpiritDevBucket | On (`ENABLE_SEED=true`) |
| Prod | Replit autoscale deployment, https://freespirit.club | branch `production`, database `free_spirit` | FreeSpiritBucket | Off |

- The Neon project is in Madushan's organisation (Launch plan). Restore window: 7 days.
  Manual snapshots are taken before risky changes and deleted after verification.
- Until 2026-10-27 the deployment used Replit's own managed database. It is retired: its
  remaining records were copied into Neon production (ADR 014).
- New environments (staging, test copies) are Neon branches of `production`, never empty
  databases. Delete test branches when done: they contain copies of real data.

## Application abuse checks (spec 019)

- `NODE_ENV=development npx tsx script/test-application-limits.ts`: disposable
  shared SQL and two-app HTTP tests, including parser order, outages and reapplication.
- `NODE_ENV=development npx tsx script/test-application-restart.ts`: separate-process
  persistence and missing-secret test. Its child-only empty secret does not change
  workspace/deployment configuration.
- `node script/test-application-feedback.cjs`: browser-only 429/503 fixtures at
  375/1440px; all non-read API requests are intercepted, no real submissions.
- Real DEV proxy verification: temporarily stop the app workflow; run
  `NODE_ENV=development npx tsx script/verify-application-proxy.ts --observe`,
  then restore the workflow and run the same script without `--observe`.
  The isolated listener exposes no identity and saves only a private temporary
  digest. Do not run against production. Do not compare workspace internet
  egress with DEV ingress: workspace requests can travel through internal proxies.
- Migration 014 adds only scoped digest/time admission events and indexes.
  Transaction advisory locks serialize each key across instances; database clock
  defines rolling windows. Cleanup removes at most 500 events older than 48 hours
  per check, including denied checks. Idle services do not run timed cleanup.
- No new service, secret, setting or production hand SQL. SESSION_SECRET rotation
  changes limiter keys and resets effective allowances; do not rotate it as a
  quota-reset technique. No raw admission identities are logged.
- The server binds to `127.0.0.1`, which works on Replit because `.replit` sets
  `exposeLocalhost = true`. Elsewhere it must bind to `0.0.0.0`.

## Source of truth and sync

GitHub `sparxy3d/Shared-Adventures` is the reference. The Replit app `@sudeshi/FREE-SPIRIT`
is where most changes are made.

- Replit Agent commits to `main` in the workspace, and Replit pushes to GitHub. Each publish
  also appears as a "Published your App" commit.
- Before reviewing on GitHub or starting work outside Replit, check that GitHub has the
  latest commits. If not, ask the agent to push (fast-forward only).
- Changes made outside Replit go through a branch and a PR into `main`. Afterwards, ask the
  Replit Agent to pull `main` (fast-forward only) before its next task.
- Do not edit the same files in Replit and outside it at the same time.

## CI and release

- `.github/workflows/pr-guards.yml` runs on every PR and push to `main`: lockfile rewrite,
  install, typecheck, build, and a check that no applied migration file was edited, renamed
  or deleted. It needs no secrets or database.
- Release is a Replit publish: `npm run build`, then `node ./dist/index.cjs`. Start-up applies
  pending migrations under an advisory lock before listening. A failed migration exits
  non-zero, so the new version never serves traffic.
- Production history is in `schema_migrations` (007, 009 to 012 baselined on 2026-10-27;
  013 applied by the first automated release).
- Release steps for people: `docs/HOW-TO-REQUEST-CHANGES.md`. Checks for agents:
  `docs/prompts/release.md`.
- Rollback: redeploy the previous version in Replit. Migrations are additive, so the previous
  version still works with the newer schema. Data mistakes are restored from Neon's history.

## Testing approach

Integration scripts in `script/test-*.ts` run real HTTP handlers, authentication and storage
against disposable schemas on the DEV database, and clean up in `finally`. Run the ones for
every area a change touches, plus `npm run check` and `npm run build`. Browser checks
(`script/capture-*.cjs`) save screenshots to `generated-artifacts/`, which is not committed.
There is no unit-test framework, and none is required for now.
