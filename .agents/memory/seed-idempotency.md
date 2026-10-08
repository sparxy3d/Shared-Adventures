---
name: Seed idempotency
description: Rules for the boot-time seed/upgrade path in this demo app
---
Deliberately enabled demo upgrades can run repeatedly, including against an already-populated database. Repeat-execution safety must be considered separately from the startup enablement gate.

**Rules:**
- Every data migration in the seed must be idempotent per record (guard each UPDATE/INSERT with a condition that is false after it has applied), not gated on all-or-nothing counts.
- Price sanity band for this demo is LKR 1500–80000; `LKR_SANE_CEILING = 100000` guards conversions. Any LKR price above the ceiling is treated as double-converted and repaired (×3/200).
- Drizzle `sql` template parameters bound to integer columns must be integers — a fractional JS number (e.g. `100000/300`) fails with `invalid input syntax for type integer` and aborts the whole seed, silently skipping later upgrades (only logged as "Seed error").

**Why:** a currency migration keyed on `currency_code = 'AUD'` re-ran on converted rows once, inflating four prices ~200×; and a non-integer bound param later aborted the repair pass on first deploy.

**How to apply:** when adding any new seed upgrade, write it so running it twice is a no-op, and check startup logs for "Seed error" after deploying.

Search time/date filters need current availability. Do not assume that restarting a server refreshes slots: seeding can be disabled, and demo top-ups are not a production scheduling strategy.
