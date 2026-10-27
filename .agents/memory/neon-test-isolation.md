---
name: Neon test schema isolation
description: Transaction-pooled Neon requires transaction-local schema scoping for isolated tests.
---

Never use a session-level SET search_path alone to isolate tests on pooled Neon.
Wrap each operation or transaction in BEGIN and SET LOCAL search_path, and leave
the backend's persistent search_path on public. Qualify production/development
audit queries explicitly when checking isolation.

**Why:** pooled connections can change PostgreSQL backends between transactions.
A session-level setting briefly made the main development preview read a test
schema and caused inconsistent test authentication. Public listing rows were
checked separately and were unchanged; the test schema was removed.

**How to apply:** use the test-only transaction-scoped adapter, avoid executing
server boot to start fixture apps, remove temporary schemas in finally, and
verify the main app reads public data after cleanup.

Authenticated fixtures must own their session table inside the disposable schema;
do not rely on search-path fallback to the application's public session table.

**Why:** that fallback can mix fixture sessions with real application sessions.
Session tables are migration-managed, so route registration does not create one.

**How to apply:** install the tracked session migration in the isolated schema
before registering routes.
