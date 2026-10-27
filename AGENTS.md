# Free Spirit

A multi-vendor marketplace for booking activities and experiences in Sri Lanka (prices in
LKR). Customers discover and request bookings, vendors list experiences and manage
availability and bookings, and admins verify vendors and curate listings. It runs on Replit
with Neon PostgreSQL. Owners: Madushan (technical), Sudeshi (product, client requirements).

This file is the entry point for any AI agent (Replit Agent, Claude Code, others) or new
engineer. Keep it under 150 lines. It holds rules and pointers only. Detail lives in
`docs/context/`.

## Every request: same process

Handle every request with `docs/prompts/request.md`, whoever asks and however it is worded.
Restate it in plain words, classify it, get the right approval, build, test, then report
**Ready to publish: Yes / No** using `docs/specs/_template/verification.md`.

| Category | Tier | Approval before code changes |
|---|---|---|
| Small fix: text, layout, styling, a bug fix that changes no data, money, login or permission behaviour | 0 | Requester: "go ahead" |
| Feature: new or changed behaviour in one area, no database change | 1 | Sudeshi or Madushan: "Approved" |
| Risky: database or migration, prices, commission, payments, payouts, login, roles, permissions, personal or ID data, deleting data, new external service, secret or env var, build or deploy settings, or crosses areas | 2 | Madushan only, recorded in the spec |

Tier 1 needs `spec.md`. Tier 2 needs `spec.md`, `design.md`, `tasks.md` and an ADR for each
real decision. Every tier 1 and 2 change ends with `verification.md`. When unsure, pick the
higher category. Never publish: that is a human decision (`docs/prompts/release.md`).

## Read before you change anything

| Need | File |
|---|---|
| What the product is, who uses it, what it is not | `docs/context/product.md` |
| Boundaries, request path, auth, ownership, data | `docs/context/architecture.md` |
| Stack, commands, environments, migrations, release | `docs/context/tech.md` |
| Coding rules for this repo | `docs/context/conventions.md` and the profile for the stack you are touching |
| Why things are the way they are | `docs/decisions/README.md` (index) |
| The change in progress | `docs/specs/<NNN>-<name>/` |
| Traps already found | `.agents/memory/MEMORY.md` (index; each line links a note) |

Load the stack profile only for the area you are editing. Do not load all of them.

Code map, by purpose: data model `shared/schema.ts` · migrations `migrations/` and
`server/migrations.ts` · API `server/routes.ts`, `server/onboarding-routes.ts`,
`server/listing-photos.ts` · queries `server/storage.ts` · pricing and commission
`shared/pricing.ts` · demo seed `server/seed.ts` · routes `client/src/App.tsx`.

Do not read: `client/src/components/ui/**` (stock shadcn), `client/public/images/**` (large
PNGs), `package-lock.json`, `dist/`, `attached_assets/`, `generated-artifacts/`, `.local/`,
`.cache/`, `.config/`, `.env`.

`replit.md` repeats the request process for Replit Agent and holds short UI pointers. Where
any doc disagrees with the code, the code wins. Say so and fix the doc in the same change.

## Commands

```
install:    npm ci                  # outside Replit, see "Lockfile trap" in tech.md
typecheck:  npm run check
build:      npm run build           # vite client + esbuild server + dist/migrations
run (dev):  npm run dev             # applies pending migrations to DEV, then serves on PORT 5000
run (prod): npm start               # deployment only. NEVER run in the workspace: it selects PROD
migrations: npm run db:status       # read-only: applied and pending files with checksums
            npm run db:migrate      # apply pending files to the selected (DEV) database
tests:      npm run test:migrations # after npm run build; disposable DEV schemas
            NODE_ENV=development npx tsx script/test-pricing.ts
            NODE_ENV=development npx tsx script/test-onboarding.ts
            NODE_ENV=development npx tsx script/test-multi-activity-applications.ts
            NODE_ENV=development npx tsx script/test-vendor-fees.ts
lint:       none exists
```

Run the test scripts for every area a change touches. They use disposable development schemas
and clean up after themselves. Never point a script at production.

## Non-negotiables

1. Identity comes from `req.session.userId` only. Never take a user id, `customerProfileId`,
   `ownerProfileId`, `vendorId`, `role`, `status`, price or commission from the request body.
2. Ownership is checked on the server for every vendor-scoped read and write: resolve the
   vendor from the session (`requireVendor` sets `res.locals.vendor`) and check the record
   belongs to it. Admin routes sit under `/api/admin`, which `requireAdmin` guards.
3. Never spread `req.body` into a storage call. Validate with a strict zod schema and pass only
   the fields that caller may set.
4. Money is whole LKR (`price_amount`, `total_amount`, `*_lkr`). Visitor prices are whole USD
   (`visitor_price_usd`). Never multiply or divide by 100. Totals, commission and vendor net
   are computed on the server (`shared/pricing.ts`) and snapshotted on the booking; never
   rewrite an existing booking's snapshot.
5. Ratings are tenths in an integer column (`46` = 4.6).
6. Anything in `server/seed.ts` must be safe to run on every boot and guarded per record. It
   runs only when `ENABLE_SEED=true`, which must stay off in production. Never use the seed
   for schema changes or real data fixes.
7. Every schema change is a new numbered file in `migrations/`, with matching types in
   `shared/schema.ts`. Never edit, rename or remove an applied file. Additive and
   backward-compatible only: expand then contract across separate releases. Never run
   `db:push` or SQL against production. The server applies pending files at start-up
   (ADR 013). New environments are created by branching Neon production.
8. Business dates and "now" are Sri Lanka time (Asia/Colombo, UTC+05:30). Use the helpers in
   `server/time.ts` and `client/src/lib/discovery.ts`, never server UTC or the browser's zone.
9. No secrets, connection strings, or personal data in code, logs, docs, tests or commits.
10. Never reference an image path unless the file exists in `client/public/images/`.
11. No new dependency without stating why an existing one does not cover it.
12. Never publish, never change production data, settings or secrets, and never weaken a test,
    validation or permission check to make something pass.

## Definition of done

- `npm run check` and `npm run build` pass, and the test scripts for the touched areas pass.
- Every acceptance criterion is verified by a test script or a recorded manual check.
- New migrations are applied in development and `npm run db:status` shows nothing pending.
- Ownership and validation rules above hold for every endpoint touched.
- Docs updated in the same change when behaviour, a boundary, a command, a setting or a
  decision changed. A new trap gets a note under `.agents/memory/` and a line in its index.
- `tasks.md` items are ticked, anything skipped is listed with the reason, and
  `verification.md` ends with **Ready to publish: Yes / No**.

## When you are unsure

- A conflict between this file and the code: the code is the current truth. Say so and
  propose a doc fix.
- A conflict between a request and `product.md` or an ADR: stop and ask the requester.
- Missing context: ask one specific question instead of guessing.
- Never invent a command, endpoint, table, column, env var, or image path. Search first.
