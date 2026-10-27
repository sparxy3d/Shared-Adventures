# Tech context

Last verified: 2026-10-08 (/onboard run by Claude against `main` at `3f4195a`; owner review pending)

What it takes to build, run, and change this repo. Every command is marked as verified or
`UNVERIFIED`.

## Stack

| Layer | Choice | Version (from `package.json`) |
|---|---|---|
| Runtime | Node.js | 20 (`.replit` module `nodejs-20`) |
| Language | TypeScript, `strict: true` | 5.6.3 |
| Server | Express | ^5.0.1 |
| Sessions | express-session with connect-pg-simple (Postgres store) | ^1.18.1, ^10.0.0 |
| ORM | drizzle-orm, drizzle-kit, drizzle-zod | ^0.39.3, ^0.31.8, ^0.7.0 |
| Database | PostgreSQL on Neon (DEV and PROD), Replit Postgres 16 as a fallback | — |
| Client | React 18, wouter, TanStack Query 5, framer-motion, shadcn/ui on Radix | ^18.3.1, ^3.3.5, ^5.60.5 |
| Styling | Tailwind CSS 3 (config in `tailwind.config.ts`), Plus Jakarta Sans | ^3.4.17 |
| Bundling | Vite 7 for the client, esbuild for the server (`script/build.ts`) | ^7.3.0, ^0.25.0 |
| Validation | zod 3 (schemas from drizzle-zod exist, but routes do not use them yet) | ^3.24.2 |

`passport`, `passport-local`, `memorystore`, `ws`, `recharts`, and others are installed but
not used by the server code. Do not assume a library is in use because it is in `package.json`.

## Repository layout

```
client/            React SPA (Vite root). src/pages, src/components, src/lib, public/images
server/            Express API: index.ts (boot), routes.ts (all endpoints), storage.ts (all queries),
                   db.ts (pool + drizzle), seed.ts (demo seed + boot-time upgrades), vite.ts, static.ts
shared/schema.ts   Drizzle tables and zod insert schemas. Imported by server and client as @shared/*
script/build.ts    Production build
.agents/memory/    Replit Agent's trap notes (also read by other agents)
docs/              This context kit
```

Path aliases: `@/*` is `client/src/*`, and `@shared/*` is `shared/*` (`tsconfig.json`, `vite.config.ts`).

## Prerequisites

- Node 20 and npm.
- A Postgres connection string (see Configuration). Without one, `server/db.ts` throws at import.

## Commands

| Purpose | Command | Status |
|---|---|---|
| Install | `npm ci` | Fails outside Replit. See "Lockfile trap" |
| Typecheck | `npm run check` | Verified 2026-10-08, 0 errors |
| Build | `npm run build` | Verified 2026-10-08. Client chunk is about 600 kB (Vite size warning) |
| Dev server | `npm run dev` | UNVERIFIED here (needs a database). It is the Replit run command |
| Prod server | `npm start` | UNVERIFIED here. Replit deployment runs `node ./dist/index.cjs` |
| Migrate | `npm run db:migrate` | Applies pending numbered SQL to the same selected database as the app |
| Migration status | `npm run db:status` | Read-only applied/pending files and SHA-256 |
| Legacy baseline | `npm run db:baseline` | One-time metadata registration of already-applied 007, 009 through 012 |
| Migration tests | `npm run test:migrations` | Disposable DEV schemas, after build; never production |
| Lint and format | none | No ESLint or Prettier config |

### Lockfile trap

Three entries in `package-lock.json` (`dotenv`, `cross-env`, `@epic-web/invariant`)
resolve to `http://package-firewall.replit.local/npm/...`, a host that only exists inside
Replit. Everything else resolves to `registry.npmjs.org`. Outside Replit (your laptop, CI,
or any future host), `npm ci` fails with E405 or E404.

Workaround until it is fixed (CI does this):

```
sed -i 's#http://package-firewall.replit.local/npm/#https://registry.npmjs.org/#' package-lock.json
```

The permanent fix is a tier 0 PR that commits the rewritten lockfile. Replit installs from
the public registry fine, because the other 592 entries already use it.

## Configuration

Read directly from `process.env` at the point of use. There is no config module and no
startup validation.

Listing-photo clients are created only inside awaited storage operations. A missing
or empty selected bucket ID makes those operations fail with the existing 503
responses, never using the project's default bucket or the other environment.
The `--real-storage` onboarding test refuses production and requires the DEV bucket.

| Variable | Used in | Purpose |
|---|---|---|
| `NEON_DATABASE_URL_DEV` | `server/db.ts`, `drizzle.config.ts` | DEV database. Used when not in production |
| `NEON_DATABASE_URL_PROD` | `server/db.ts` | PROD database. Used when `NODE_ENV=production` or `REPLIT_DEPLOYMENT` is set; Drizzle has no production path |
| `DATABASE_URL` | `server/db.ts`, `drizzle.config.ts` | Fallback when the matching Neon variable is absent |
| `LISTING_PHOTOS_BUCKET_DEV` | `server/listing-photos.ts`, real-storage onboarding test | Explicit DEV App Storage bucket ID. Required outside production; no default-bucket fallback |
| `LISTING_PHOTOS_BUCKET_PROD` | `server/listing-photos.ts` | Explicit PROD App Storage bucket ID when `NODE_ENV=production` or `REPLIT_DEPLOYMENT` is set. Production must never fall back to the development bucket |
| `DB_TARGET` | `drizzle.config.ts`, test guards | Legacy `prod` is refused; not a migration target selector |
| `SESSION_SECRET` | `server/routes.ts` | Session cookie signing. Falls back to a hard-coded string (known debt) |
| `ENABLE_SEED` | `server/index.ts` | `true` runs `seedDatabase()` at boot. Any other value skips it |
| `PORT` | `server/index.ts` | Listen port, default 5000 (`.replit` sets 5000) |
| `NODE_ENV` | `server/index.ts`, `db.ts`, build | `production` serves `dist/public` statically. Otherwise Vite middleware runs |
| `REPLIT_DEPLOYMENT` | `server/db.ts` | Set by Replit in deployments. Forces the PROD database |

`.env` is loaded by `dotenv/config` and is git-ignored. No `.env.example` exists.

## Environments

| Environment | Where | Database | Seed |
|---|---|---|---|
| Dev | Replit workspace, `npm run dev`, port 5000 | Neon DEV, else `DATABASE_URL` | UNKNOWN whether `ENABLE_SEED=true` is set |
| Prod | Replit autoscale deployment (`.replit` `[deployment]`) | Neon PROD, else `DATABASE_URL` | UNKNOWN whether `ENABLE_SEED=true` is set |

The server binds to `127.0.0.1` (`server/index.ts`). Replit works because `.replit` sets
`exposeLocalhost = true`. On Railway, Render, Fly.io, or a container, it must bind to
`0.0.0.0`, or the app is unreachable.

## Source of truth and sync

There are three copies: GitHub `sparxy3d/Shared-Adventures` (source of truth), the Replit
app `@sudeshi/FREE-SPIRIT`, and local clones.

- Replit Agent commits straight to `main`, often as "Published your App". Pull before you
  start work, and before you run a Replit prompt.
- Changes made outside Replit go through a branch and a PR into `main`. Replit then pulls `main`.
- Do not edit the same files in Replit and in a local clone at the same time.

## CI and release

- `.github/workflows/pr-guards.yml` runs on every PR and on pushes to `main`: install (with
  the lockfile rewrite), `npm run check`, and `npm run build`. It needs no secrets or
  database. It is the only automated gate.
- Release is a Replit deployment: `npm run build`, then `node ./dist/index.cjs`. It is
  triggered from Replit, and each publish appears as a commit on `main`.
- Every schema change is a new numbered `migrations/NNN_description.sql` file. Never
  edit/remove an applied file or run db:push/hand SQL against production.
- Only additive, backward-compatible migrations. Expand and contract across separate
  releases so a failed release can leave the previous app compatible with the schema.
- Startup runs migrations before listening, seeding or registering routes. Failure
  exits non-zero. SQL is copied to `dist/migrations`; CLI is `dist/migrate.cjs`.
- A dedicated direct Neon connection holds a session advisory lock throughout the
  run; pooled Neon hostnames have only their `-pooler` suffix removed. Database,
  credentials and environment selection remain the same as `server/db.ts`.
- `schema_migrations` records filename, SHA-256 checksum and applied_at. Each file
  and its history insert share one transaction. Changed/missing history files fail.
- Existing hand-upgraded databases must first run `npm run db:baseline`, or
  `NODE_ENV=production node dist/migrate.cjs baseline` in the production environment
  using its existing secrets. This records 007, 009, 010, 011, 012 without running them.
  There is no 008 migration. It verifies legacy column prerequisites and never records 013.
- Check `node dist/migrate.cjs status` with the appropriate environment after baseline.
  On the next start, 013 creates the session table/index idempotently. The session
  package no longer creates tables or reads its bundled table.sql.
- New environments are created by branching the Neon production database. An empty
  database bootstrap is deliberately unsupported. See ADR 013.

## Testing approach

Use `npm run check`, `npm run build` and `npm run test:migrations`. Migration tests
use disposable schemas on the selected DEV database, direct connections, and clean up
in finally. Built-server tests point both subprocess database variables to the isolated
DEV fixture and omit ENABLE_SEED only in that subprocess. Configured secrets are unchanged.
Other focused test scripts live in script/. No new test framework is required.
