# Context kit

A small set of markdown files that gives AI agents and engineers the same project context,
plus one process for every change. Plain files, no tooling. Last refreshed 2026-10-27.

## What is in it

```
AGENTS.md                      entry point for any agent: process, rules, commands (must be at the root)
CLAUDE.md                      imports AGENTS.md for Claude Code (must be at the root)
replit.md                      Replit Agent's entry point: repeats the request process (must be at the root)
.claude/commands/              slash-command wrappers for the prompts
.agents/memory/                trap notes and standing rules for agents (index: MEMORY.md)
docs/
  CONTEXT-KIT.md               this file
  HOW-TO-REQUEST-CHANGES.md    for Sudeshi and other non-technical requesters
  context/
    product.md                 what, for whom, business rules, non-goals, glossary
    architecture.md            boundaries, request path, ownership, auth, data, known debt
    tech.md                    stack, commands, configuration, environments, migrations, release
    conventions.md             cross-stack rules and index of profiles
    profiles/                  node-ts, react, sql
  decisions/                   ADRs, append-only (index: README.md)
  specs/
    _template/                 spec.md, design.md, tasks.md, verification.md
  prompts/                     request, spec, plan, implement, review, release, onboard
```

## The process

Every request goes through `docs/prompts/request.md`, whoever asks and however it is worded.

| Step | Prompt | Output | Who approves |
|---|---|---|---|
| Intake | `request` | Plain restatement and category | — |
| Specify | `spec` | `docs/specs/<NNN>-<name>/spec.md` | Feature: Sudeshi or Madushan. Risky: Madushan |
| Plan (Risky) | `plan` | `design.md`, `tasks.md`, ADRs | Madushan reads the design |
| Build | `implement` | Code, migration, tests, docs, `verification.md` | Tests and verification |
| Review | `review` | Findings against spec and rules | Optional second agent or person |
| Release | `release` | "OK to publish" and "Live site" checks | A person publishes |

Categories and approvals are defined once in `AGENTS.md` and repeated in `replit.md`.

## Guards that do not depend on the agent

- The migration runner refuses to start the server if an applied migration was edited or is
  missing, and applies new ones in a transaction before serving traffic (ADR 013).
- CI fails if an applied migration file is edited, renamed or deleted, or if typecheck or
  build fails.
- Production secrets belong only in the deployment's secrets. The workspace (where agents
  run) should not hold `NEON_DATABASE_URL_PROD`, so nothing run there can reach production.

## Keeping it true

One rule: a change that alters behaviour, a boundary, a command, a setting or a decision
updates the matching doc in the same change. The `review` and `implement` prompts check this.

Each context file has a "Last verified" line. Re-run `onboard` when it is older than three
months, or after a burst of releases.

Only document what the code cannot tell you: intent, boundaries, reasons, and traps.

## Shared kit

The reusable kit lives in the Mira-Dev-V2 repo. Improvements made here that are not
Free Spirit-specific (the request and release prompts, the verification template, the CI
migration guard) should be copied back there deliberately, not left to drift.
