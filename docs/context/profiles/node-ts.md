# Stack profile: Node.js / TypeScript

Edited 2026-10-08 to match this repo. Applies to `server/`, `shared/`, `script/`.

## Structure

```
server/
  index.ts     boot: body parsers, /api logger, optional seed, routes, error handler, Vite or static, listen
  routes.ts    every endpoint, plus requireAuth / requireAdmin and password hashing
  storage.ts   IStorage interface and DatabaseStorage: every query
  db.ts        pg.Pool + drizzle, picking Neon DEV or PROD
  seed.ts      demo seed, currency normalization, idempotent demo upgrades
  vite.ts      dev middleware;  static.ts  prod static and SPA fallback
shared/schema.ts   tables, zod insert schemas, types (imported as @shared/schema)
```

Dependency direction: `routes.ts` → `storage.ts` → `db.ts`. `storage.ts` never touches
`req` or `res`. The client may import types and schemas from `shared/`, never from `server/`.

## Conventions

- `strict: true` (`tsconfig.json`). Avoid `any`. New storage methods return typed rows,
  not `any[]` (several existing ones return `any[]`, which is debt).
- ESM source (`"type": "module"`), bundled to a CommonJS `dist/index.cjs` by esbuild.
  Packages not in the allowlist in `script/build.ts` stay external. Add a server dependency
  to that list only if you want it bundled.
- Validate request bodies with zod at the top of the handler:
  `insertExperienceSchema.pick({...}).parse(req.body)`, or `safeParse` returning 400.
  Never spread `req.body` into storage.
- Read `process.env` at the point of use, as today. A new required variable must fail
  loudly at boot (copy the pattern in `server/db.ts`) and be added to `tech.md`.
- `async`/`await` only.
- Dates for business logic are computed in Asia/Colombo. Add a small helper in `server/`
  rather than repeating `toISOString().split("T")[0]` (that gives a UTC date).

## Data access

- All SQL goes through `storage.ts` with the drizzle query builder or `sql` templates.
- Scope by owner inside the query when you can (`where vendor_id = $vendorId`), rather than
  loading and checking afterwards.
- Use a join, or `inArray`, instead of a query per row in list endpoints.
- Use a transaction (`db.transaction`) for multi-step writes, for example booking plus slot capacity.

## Security

- Sessions only. `requireAuth` for signed-in users, `requireAdmin` for admin endpoints,
  plus an ownership check for vendor endpoints.
- Passwords use scrypt (`hashPassword` / `comparePasswords` in `routes.ts`). Never return
  the `password` column. Strip it as the auth handlers do.
- No rate limiting exists. Adding it to login and signup is its own change.

## Testing

None yet. Do not add a test framework as a side effect of a feature.

## Commands

```
npm run check     # tsc
npm run build     # client + server bundle
npm run dev       # needs a database URL
```

## Do not

- Spread `req.body` into a create or update.
- Trust an id, role, status, or price from the client.
- Return `error.message` from a 500 in new code.
- Log response bodies that contain personal data.
- Bind to a fixed host or port in new hosting code. Use `PORT`, and `0.0.0.0` off Replit.
