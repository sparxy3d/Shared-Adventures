# Conventions

Last verified: 2026-10-27 (kit refresh by Claude)

This file holds the rules that apply across the whole repo and indexes the stack profiles.
Where a profile and the existing code disagree, the code wins until someone updates the
profile on purpose.

## Stack profiles in use

| Area | Profile | Applies to |
|---|---|---|
| Node / TypeScript | `profiles/node-ts.md` | `server/`, `shared/`, `script/` |
| React | `profiles/react.md` | `client/` |
| SQL (PostgreSQL, drizzle) | `profiles/sql.md` | `migrations/`, `shared/schema.ts`, `server/storage.ts`, `server/seed.ts` |

There are no .NET or Angular profiles, because no code in this repo uses either.

## Rules for every stack

### Naming

- Use the glossary in `product.md`. In code an activity is an "experience" and a session is a
  "slot".
- TypeScript is camelCase and SQL is snake_case. drizzle maps between them in `shared/schema.ts`.
- A user id is named for its role: `customerProfileId`, `ownerProfileId`. Keep that pattern.
- Migration files: `migrations/NNN_short_description.sql`, next free number, lowercase.

### Errors

- Handlers return a status and `{ message }`. 400 bad input, 401 not signed in, 403 not
  allowed, 404 not found or not visible to this caller, 409 state conflict, 429 rate limited,
  503 a dependency (storage) is unavailable.
- A 500 never returns internal details. The central handler logs and returns a generic message.
- A `catch` is never empty.

### Logging

- `console.*` with a bracketed prefix, for example `[migrations]` or `[auth]`.
- Never log passwords, session ids, connection strings, request or response bodies, or
  personal data (email, phone, full name, documents).

### Security

- The session decides identity, and the server decides ownership (`AGENTS.md` rules 1 to 3).
- Validate every request body with a strict zod schema, and allow-list the fields each role may set.
- Parameterised queries only: the drizzle query builder or `sql` template parameters.
- Uploads: check size, content signature and type on the server, and never serve user files
  from a public path without an access check.

### Tests

- Each feature area has an integration script in `script/test-<area>.ts` using disposable
  development schemas. Extend the script for the area you change.
- A fix for an ownership, pricing or permission bug gets a test case that fails without it.
- Every change records how each acceptance criterion was verified in `verification.md`.

### Copy

- No em dashes in user-facing text. Plain, friendly sentences. Prices as "LKR 2,500".

### Git

- `main` is the only long-lived branch. Replit Agent commits to it directly in the workspace.
- Work outside Replit uses branches named `<type>/<short-name>` (`feat`, `fix`, `chore`,
  `docs`, `refactor`) and a PR into `main`.
- One spec per PR or Replit task. Split anything over roughly 400 changed lines.

### Documentation

- A change that alters behaviour, a boundary, a command, a setting or a decision updates the
  matching doc in the same change.
- Comments explain why. Code explains what.
- When you discover a trap, add a note under `.agents/memory/` and one line to
  `.agents/memory/MEMORY.md`.

## Repo-specific rules

Things that are true here and would surprise a competent engineer from another codebase.

- **Endpoints live in `server/routes.ts`** (plus `onboarding-routes.ts` and `listing-photos.ts`),
  and all queries in `server/storage.ts`. Do not start a new layering pattern inside a feature.
- **Vendor endpoints sit under `/api/vendor`** behind `requireVendor`; use
  `res.locals.vendor` and check ownership of the target record in the handler.
- **Admins edit listings on vendors' behalf.** Keep that working when you change listing
  management (`.agents/memory/vendor-onboarding.md`).
- **Schema changes are numbered SQL files**, applied at start-up (ADR 013). `db:push` and
  drizzle-kit `generate` are disabled on purpose.
- **The seed runs only with `ENABLE_SEED=true`**, is development-only, and must be safe to repeat.
- **Dates are `YYYY-MM-DD` text, and times are `HH:MM` text**, in Sri Lanka time.
- **The lockfile has three Replit-only URLs.** See `tech.md`. Fix it only as its own Small fix.
