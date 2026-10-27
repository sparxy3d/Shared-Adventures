# 015. Every request goes through one intake process with category-based approval

- Status: accepted
- Date: 2026-10-27
- Deciders: Madushan
- Related spec: none (process)

## Context

Most changes are requested by Sudeshi, who is not technical, through the Replit Agent in
plain language. On 2026-10-27, code reached production before its database changes several
times, and risky work (money, documents, schema) was built and published without a technical
review. The process has to hold no matter how a request is worded.

## Decision

Every request is handled with `docs/prompts/request.md`: the agent restates it, classifies it
as Small fix, Feature or Risky, writes a spec for Features and Risky changes, waits for the
right approval, builds, tests, and ends with `verification.md` stating **Ready to publish: Yes / No**.
Small fixes need the requester's go-ahead, Features need Sudeshi's or Madushan's approval, and
Risky changes (database, money, login and permissions, personal data, deletions, external
services, secrets, build or deploy settings) need Madushan's approval recorded in the spec.
Agents never publish. The rule is repeated at the top of `replit.md`, which Replit Agent
reads every session, and in `AGENTS.md`.

## Options considered

| Option | For | Against |
|---|---|---|
| Category-based approval (chosen) | Sudeshi moves fast on small and contained work; risky work gets technical review | Risky work waits for Madushan |
| Sudeshi approves everything | Fastest | Today's incidents show risky changes need technical review |
| Madushan approves everything | Safest | Bottleneck for copy and layout changes |

## Consequences

- Easier: Sudeshi can request anything in her own words, and every change leaves a spec and
  a verification report.
- Harder: Risky changes wait for Madushan's reply.
- New obligations: keep `replit.md`'s process section intact. Automatic guards back up the
  agent's discipline: the migration runner refuses edited or missing migrations at start-up,
  and CI rejects edits to applied migration files.

## Revisit when

A second technical reviewer joins, or Risky approvals regularly wait more than a day.
