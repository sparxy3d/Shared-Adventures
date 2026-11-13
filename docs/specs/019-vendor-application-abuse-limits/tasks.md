# 019 Tasks

Approved design prepared before code.

- [x] 1. Add migration/schema and atomic rolling storage method plus disposable
  database tests for concurrency, aged boundaries, denial and cleanup. AC3/4/8.
- [x] 2. Add scoped HMAC/client-IP service and route ordering, preserving existing
  auth/application behaviour; HTTP parser-order, failure, reapplication/admin and
  two-instance tests. AC1/2/3/4/5/7/9.
- [x] 3. Show safe 429 retry times and 503 messages while preserving inputs/files.
  Browser feedback tests; existing form layout unchanged. AC6.
- [x] 4. Verify actual proxy, apply DEV migration, run relevant regression/migration
  suites and typecheck/build; update context/ADR/memory and verification. AC8/9/10.

## Final check

- [x] All criteria verified; proxy and fixture corrections/limitations reported.
- [x] No seed/ENABLE_SEED, login/waiting-list policies, money or document-storage changes.
- [x] No production writes, publish, new dependencies or secret changes.
- [x] verification.md ends Ready to publish: Yes.
