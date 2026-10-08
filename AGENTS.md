# Free Spirit

A multi-vendor marketplace for booking activities and experiences in Sri Lanka (prices in
LKR). Customers discover and request bookings, vendors list experiences and manage
availability and bookings, and admins verify vendors and curate listings. It is an MVP
running on Replit.

This file is the entry point for any AI agent (Claude Code, Replit Agent, others) or new
engineer. Keep it under 150 lines. It holds rules and pointers only. Detail lives in
`docs/context/`.

## Read before you change anything

| Need | File |
|---|---|
| What the product is, who uses it, what it is not | `docs/context/product.md` |
| Boundaries, request path, auth, ownership, data | `docs/context/architecture.md` |
| Stack, versions, how to build, run, push schema, environments | `docs/context/tech.md` |
| Coding rules for this repo | `docs/context/conventions.md` and the profile for the stack you are touching |
| Why things are the way they are | `docs/decisions/` |
| The change in progress | `docs/specs/<NNN>-<name>/` |
| Traps already found | `.agents/memory/MEMORY.md` (index; each line links a note) |

Load the stack profile only for the area you are editing. Do not load all of them.

Code map, by purpose: data model `shared/schema.ts` · API `server/routes.ts` · queries and
search filters `server/storage.ts` · demo seed and boot-time upgrades `server/seed.ts` ·
key pages `client/src/pages/home.tsx`, `search.tsx`, `experience-detail.tsx`.

Do not read: `client/src/components/ui/**` (stock shadcn), `client/public/images/**`
(about 26 MB of AI-generated PNGs; see "Images" in `architecture.md`), `package-lock.json`,
`dist/`, `attached_assets/`, `.local/`, `.cache/`, `.config/`, `.env`.

`replit.md` is maintained by Replit Agent and describes UI design. Where it disagrees with
the code or with `docs/context/`, the code wins.

## How changes are made

Pick the tier before you start. If unsure, ask.

| Tier | When | Required artifacts |
|---|---|---|
| 0 | Bug fix, copy change, dependency bump, refactor with no behaviour change | None. Explain in the PR description. |
| 1 | New behaviour inside one area, no schema or API contract change | `spec.md` |
| 2 | Crosses areas, or changes schema, an API contract, auth, ownership checks, booking or pricing rules, or seed upgrades that touch existing data | `spec.md`, `design.md`, `tasks.md`, and an ADR for each real decision |

Flow for tier 1 and 2: `/spec` then (tier 2) `/plan` then `/implement` then `/review`.
Do not write code for a tier 1 or 2 change until its `spec.md` has status `approved`.

Replit Agent prompts: name the spec folder and tell it to follow `AGENTS.md`. One prompt per
task in `tasks.md`, not one prompt per feature.

## Commands

```
install:   npm ci                 # outside Replit, fails until the lockfile host is fixed (tech.md)
typecheck: npm run check          # tsc, strict. Passes as of 2026-10-08
build:     npm run build          # vite client + esbuild server into dist/. Passes as of 2026-10-08
run (dev): npm run dev            # one process, API and client on PORT (default 5000)
run (prod):npm start              # node dist/index.cjs
schema:    npm run db:push        # drizzle-kit push to Neon DEV; DB_TARGET=prod targets PROD
test:      none exists
lint:      none exists
```

CI (`.github/workflows/pr-guards.yml`) runs install, typecheck, and build on every PR and
on pushes to `main`. Full list, environment variables, and environments: `docs/context/tech.md`.

## Non-negotiables

1. Identity comes from `req.session.userId` only. Never take a user id, `customerProfileId`,
   `ownerProfileId`, `vendorId`, `role`, `status`, or price from the request body. Set
   them on the server.
2. Ownership is checked on every vendor-scoped read and write. Resolve the vendor with
   `storage.getVendorByOwner(req.session.userId)`, then check that the record belongs to
   it (`experience.vendorId === vendor.id`, and the slot or booking belongs to one of that
   vendor's experiences). Admin routes use `requireAdmin`.
3. Never spread `req.body` into a storage call. Validate it with a zod schema (the
   `insert*Schema` exports in `shared/schema.ts`, narrowed with `.pick()`), and pass only
   the fields that caller is allowed to set.
4. Money is whole LKR in `price_amount` and `total_amount`. Never divide or multiply by
   100. Booking totals are recomputed on the server from the experience price.
5. Ratings are tenths in an integer column (`46` = 4.6).
6. Anything in `server/seed.ts` must be safe to run again on every boot, and guarded per
   record. Values bound to integer columns must be integers (`Math.round`), or the whole
   seed aborts.
7. `shared/schema.ts` is the only schema definition. Push to Neon DEV first. Push to PROD
   only on purpose, after reading what drizzle-kit says it will drop or rewrite.
8. Business dates and "now" are Sri Lanka time (Asia/Colombo, UTC+05:30), not server UTC
   and not the browser's zone. Existing code gets this wrong (`architecture.md`, known
   debt). Do not copy that pattern.
9. No secrets, connection strings, or personal data in code, logs, docs, or commits.
10. Never reference an image path unless the file exists in `client/public/images/`. The UI
    falls back to `/images/fallback.png`.
11. No new dependency without stating why an existing one does not cover it.

## Definition of done

- `npm run check` and `npm run build` pass.
- Each acceptance criterion in `spec.md` was verified, and the PR says how (there is no
  test runner yet, so name the manual check or script).
- Ownership and validation rules above hold for every endpoint touched.
- Docs updated in the same PR when behaviour, a boundary, a command, or a decision changed.
- A new trap gets a note under `.agents/memory/` and one line in its index.
- `tasks.md` items are ticked, and anything skipped is listed with the reason.

## When you are unsure

- A conflict between this file and the code: the code is the current truth. Say so and
  propose a doc fix.
- A conflict between a spec and an ADR: stop and ask.
- Missing context: ask one specific question instead of guessing.
- Never invent a command, endpoint, table, column, env var, or image path. Search first.
