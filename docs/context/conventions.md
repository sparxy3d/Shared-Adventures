# Conventions

Last verified: 2026-10-08 (/onboard run by Claude; owner review pending)

This file holds the rules that apply across the whole repo and indexes the stack profiles.
Where a profile and the existing code disagree, the code wins until someone updates the
profile on purpose.

## Stack profiles in use

| Area | Profile | Applies to |
|---|---|---|
| Node / TypeScript | `profiles/node-ts.md` | `server/`, `shared/`, `script/` |
| React | `profiles/react.md` | `client/` |
| SQL (PostgreSQL, drizzle) | `profiles/sql.md` | `shared/schema.ts`, `server/storage.ts`, `server/seed.ts` |

There are no .NET or Angular profiles, because no code in this repo uses either.

## Rules for every stack

### Naming

- Use the glossary in `product.md`. An activity is an "experience", and a session is a
  "slot" in code.
- TypeScript is camelCase and SQL is snake_case. drizzle maps between them in `shared/schema.ts`.
- A user id is named for its role: `customerProfileId`, `ownerProfileId`. Keep that pattern.

### Errors

- Handlers return a status and `{ message }`. 400 means bad input, 401 means not signed in,
  403 means the caller does not own the record, 404 means not found, and 409 means a state
  conflict (for example, a slot that is no longer available).
- New code must not return raw `error.message` from a 500. Log it, and return a generic
  message. Existing handlers still do this (known debt).
- A `catch` is never empty.

### Logging

- `console.*` with a bracketed prefix, for example `[seed]` or `[bookings]`.
- Never log passwords, session ids, connection strings, or personal data (email, phone,
  full name).

### Security

- The session decides identity, and the server decides ownership (`AGENTS.md` rules 1–3).
- Validate every request body with zod, and allow-list the fields each role may set.
- Parameterised queries only. Use the drizzle query builder or `sql` template parameters,
  never string concatenation.

### Tests

- There is no test runner yet. Every PR states how it was verified, by naming the manual
  check and the test account used.
- Once a runner exists, a fix for an ownership or pricing bug gets a test that fails without it.

### Git and pull requests

- `main` is the only long-lived branch, and Replit Agent commits to it directly.
- Branch names: `<type>/<short-name>`, for example `fix/vendor-slot-ownership` or
  `feat/012-reviews`. Types: `feat`, `fix`, `chore`, `docs`, `refactor`.
- Commits use the imperative mood. Prefer `type(scope): summary` for new work.
- One PR covers one spec or one tier 0 change. A PR over roughly 400 changed lines gets split.
- The PR description links the spec and says how each acceptance criterion was verified.

### Documentation

- A PR that changes behaviour, a boundary, a command, or a decision updates the matching
  doc in the same PR.
- Comments explain why. Code explains what. Keep the existing "why" comments in
  `server/db.ts`, `server/seed.ts`, and the booking handler.
- When you discover a trap, add a note under `.agents/memory/` and one line to
  `.agents/memory/MEMORY.md`.

## Repo-specific rules

Things that are true here and would surprise a competent engineer from another codebase.

- **All endpoints live in `server/routes.ts`, and all queries in `server/storage.ts`.** Add to
  them. Do not start a second pattern (routers or services) inside a feature PR.
- **Ownership checks are inline in each handler.** There is no vendor middleware. Copy the
  `PATCH /api/vendor/experiences/:id` pattern, not `DELETE /api/vendor/slots/:id`.
- **The seed runs at boot, and must be safe to repeat** (`.agents/memory/seed-idempotency.md`).
- **Admins edit listings on vendors' behalf.** Keep that working when you change listing
  management (`.agents/memory/vendor-onboarding.md`).
- **Dates are `YYYY-MM-DD` text, and times are `HH:MM` text.** Compare them as strings only
  when both sides are in the same zone. Use `client/src/lib/dates.ts` helpers on the client.
- **No migrations folder.** Schema changes are `drizzle-kit push`. See `profiles/sql.md`.
- **The lockfile has three Replit-only URLs.** See `tech.md`. Do not "fix" it by hand in an
  unrelated PR.
