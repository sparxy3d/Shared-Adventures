# ADR 013: Tracked startup migrations

Status: accepted. Supersedes the owner-applied production SQL provisions of ADRs 007
and 010, not their privacy, ownership or storage decisions.

## Decision
Every schema change is a new numbered SQL file in migrations/. Never modify or remove
an applied file. pg applies each file and its checksum record atomically under a
dedicated direct-connection advisory lock before the server listens.

Only additive, backward-compatible releases are allowed. Expand and contract in
separate releases, retaining compatibility with the previous deployed application.
Never use db:push or hand-applied SQL in production. Existing hand-upgraded databases
need a one-time explicit tracked baseline; new environments branch Neon production.

## Why
Manual production SQL was repeatedly missed, allowing successful publishes with broken
runtime queries. Tracked startup migrations fail closed before traffic is served.
Advisory locking requires a direct Neon connection, not transaction-pooler affinity.

## Consequences
Production needs the one-time baseline before this release. Operators must review SQL
for backward compatibility; the runner is not a semantic SQL safety checker. Successfully
applied earlier files remain if a later file fails, so rollback compatibility is essential.
The platform controls whether a failed publish retains the prior serving revision;
this application guarantees non-zero exit and no listening socket on migration failure.
