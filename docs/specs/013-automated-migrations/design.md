# Design

Use existing pg and Node crypto/fs. A dedicated client connects to the same selected
database as server/db.ts. For Neon pooled URLs the migration connection removes the
`-pooler` hostname suffix, using the direct endpoint for reliable session advisory locks.
The application's pooled connection and DEV/PROD selection remain unchanged.

Hold one session advisory lock across history validation and all per-file transactions.
Create schema_migrations only in a write command. Status uses a read-only transaction.
Read and hash the exact SQL bytes before execution. Legacy files contain outer
BEGIN/COMMIT; remove only those outer wrappers in memory so the runner owns the
transaction including the history insert. Never change historical SQL bytes.

Existing app tables without tracked history require explicit baseline. Baseline verifies
legacy schema prerequisites, then records existing 007, 009, 010, 011, 012 files
without executing SQL. There is no 008 file. Fresh environments branch production,
not an empty-database bootstrap. Baseline never records 013.

Copy SQL into dist/migrations. A bundled migration CLI supports the one-time production
baseline without tsx. Startup fails before seeds, routes or listening if migrations fail.
Use sanitized migration errors (filename and PostgreSQL code, not SQL data/credentials).

Production: owner runs the one-time baseline using the release artifact against the
already-upgraded database, checks status, then publishes. Future additive migrations
run at boot. No production command is executed during this implementation.
