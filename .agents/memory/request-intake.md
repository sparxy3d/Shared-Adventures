---
name: Request intake and approval
description: Every request, however worded, goes through docs/prompts/request.md with category-based approval; agents never publish.
---

Requests usually come from Sudeshi in plain language. Restate, classify (Small fix,
Feature, Risky), spec, wait for approval, build, test, then write verification.md ending with
"Ready to publish: Yes / No".

**Why:** on 2026-10-27, code was published before its database changes several times, and
risky work reached production without technical review (ADR 015).

**How to apply:** Risky means database or migration, money, login or permissions, personal or
ID data, deleting data, external services, secrets, or build and deploy settings. It needs
"Madushan approved" recorded in the spec before any code changes. Never publish, never touch
production, and never run `npm start` in the workspace (it selects the production database).
