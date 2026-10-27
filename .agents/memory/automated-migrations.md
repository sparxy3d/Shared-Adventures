---
name: Automated migrations
description: Owner-approved migration rollout policy replacing manual production SQL.
---

Every schema change is a new numbered migrations/ file. Never change or remove an
applied file. Only additive, backward-compatible changes; expand and contract in
separate releases. Never db:push or hand SQL against production. New environments
are created by branching Neon production.

**Why:** the owner approved automated tracked migrations after repeated manual
rollout omissions broke production. This supersedes manual-production-SQL rules
in ADRs 007 and 010 without changing their privacy or storage decisions.

**How to apply:** baseline existing hand-upgraded databases once, then rely on
startup migration checks. Do not connect to production during development tasks
without separate permission. Use direct Neon connections for session advisory
locks, never transaction-pooler session affinity.
