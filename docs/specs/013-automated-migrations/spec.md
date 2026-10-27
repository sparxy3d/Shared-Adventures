# Automated database migrations

Status: approved
Tier: 2
Owner approval: Madushan, through the Stage 013 request.

## Scope
- Track numbered SQL files by filename, SHA-256 and application time.
- Serialize migration runners with a PostgreSQL advisory lock; transact each file.
- Refuse changed or missing applied files and require explicit legacy baselining.
- Run before listening in development and production, with production failure exiting non-zero.
- Ship SQL with the production bundle; provide migrate, read-only status and baseline commands.
- Move the unchanged 007 SQL to migrations; add idempotent session-table migration 013.
- Baseline development only. No production connection, publishing, secrets or seed changes.
- Replace schema pushes and owner-applied production SQL with immutable, backward-compatible migrations.

## Acceptance
Disposable-schema tests cover pending application, skipping, integrity refusal,
baseline refusal, rollback, concurrent starts and built-server startup/failure.
Typecheck and production build pass. Report file hashes and production baseline steps.
