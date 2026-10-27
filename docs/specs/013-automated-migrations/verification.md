# Verification

Verified 2026-10-27 against disposable schemas in the development Neon database:

- `npm run check`: passed.
- `npm run build`: passed, includes dist/index.cjs, dist/migrate.cjs and exact SQL copies.
- `npm run test:migrations`: passed status read-only, pending apply, skip applied,
  changed checksum, missing file, atomic rollback, legacy refusal, incomplete
  baseline refusal, concurrent lock, real historical baseline metadata only,
  bundled production startup/migration/HTTP 200 and non-zero exit/no listener
  on checksum failure. Disposable schemas removed in finally.
- Development only: `npm run db:baseline` recorded 007 and 009 through 012;
  `npm run db:migrate` applied 013; `npm run db:status` listed all six applied.
- Restarted the existing development workflow once after the changes; it listened
  on port 5000, served the homepage with HTTP 200, and had no migration error.
  A public preview screenshot loaded successfully; its unauthenticated auth/me
  401 is expected. Existing seed gate and seed logic were not changed.
- The 007 file matches the historical tracked SQL byte for byte (`cmp` passed).
- No production database access, publish, secret, or seed changes.

Production handoff: the owner must verify production already has the 007 through
012 schema, run `node dist/migrate.cjs baseline` with `NODE_ENV=production`
against their production environment before rollout, inspect
`node dist/migrate.cjs status`, then publish. Automatic startup applies 013.
There is no 008 file. Do not execute historical SQL manually.
