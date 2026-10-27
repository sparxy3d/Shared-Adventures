# Stack profile: Node.js / TypeScript

Edited 2026-10-27 to match this repo. Applies to `server/`, `shared/`, `script/`.

## Structure

```
server/
  index.ts              boot: parsers, request log, migrations, seed gate, routes, error handler, Vite or static, listen
  migrations.ts         migration runner (advisory lock, checksums, schema_migrations)
  routes.ts             most endpoints, guards (requireAuth, requireAdmin, requireVendor), password hashing
  onboarding-routes.ts  site settings, waiting list
  listing-photos.ts     photo upload, ordering, deletion, public image API (App Storage)
  vendor-documents.ts   verification document upload parsing and validation
  storage.ts            DatabaseStorage: every query and transaction
  db.ts                 pg.Pool + drizzle, picking Neon DEV or PROD
  time.ts               Sri Lanka date and time helpers
  seed.ts               demo seed (ENABLE_SEED=true only)
shared/  schema.ts (tables, zod, types), pricing.ts (totals, commission), catalog.ts (enums, constants)
script/  build.ts, migrate.ts, test-*.ts integration scripts
```

Dependency direction: routes → `storage.ts` → `db.ts`. `storage.ts` never touches `req` or
`res`. The client may import from `shared/`, never from `server/`.

## Conventions

- `strict: true`. Avoid `any`. New storage methods return typed rows.
- ESM source, bundled to CommonJS `dist/index.cjs` by esbuild. Packages on the allowlist in
  `script/build.ts` are bundled; their bundled assets are not copied (that is why the session
  table now comes from a migration). Check this when adding a package that reads its own files.
- Validate request bodies with a strict zod schema at the top of the handler (`parse()` helper
  returning 400). Never spread `req.body` into storage.
- Read `process.env` at the point of use. A new variable must fail clearly when missing and be
  added to the Configuration table in `tech.md`, with its DEV and PROD values noted.
- `async`/`await` only. Wrap handlers with `h(...)` so errors reach the central handler.
- Business dates and times: use `server/time.ts` (`colomboToday`, `colomboNowHHMM`), never
  `toISOString().split("T")[0]`.

## Data access

- All SQL goes through `storage.ts` with the drizzle query builder or `sql` templates.
- Scope by owner inside the query when you can, rather than loading and checking afterwards.
- Use a join or `inArray` instead of a query per row in list endpoints.
- Multi-step writes use `db.transaction` with row locks (`.for("update")`), as the booking
  request and vendor approval do.

## Security

- Sessions only. `requireAuth`, `requireAdmin` (on `/api/admin`), `requireVendor` (on
  `/api/vendor`), plus an ownership check in each vendor handler.
- Passwords use scrypt (`hashPassword` / `comparePasswords`). Never return the `password`
  column. Temporary passwords set `mustChangePassword`.
- Rate limits exist for login and the waiting list (in memory). Add one to any new public
  endpoint that accepts uploads or creates records.

## Testing

Integration scripts in `script/test-<area>.ts` with disposable development schemas. Extend the
script for the area you change. No unit-test framework.

## Commands

```
npm run check     # tsc
npm run build     # client + server bundle + migrations copy
npm run dev       # applies DEV migrations, then serves
npm run db:status # applied and pending migrations
```

## Do not

- Spread `req.body` into a create or update.
- Trust an id, role, status, price or commission from the client.
- Return internal error details from a 500.
- Log request or response bodies, or personal data.
- Run `npm start` in the workspace: it selects the production database.
