# Context kit

A small set of markdown files that gives AI agents and engineers the same project context,
plus a spec, plan, implement, review loop for changes. Plain files, no tooling.

## What is in it

```
AGENTS.md                      entry point for any agent: rules and pointers (must be at the root)
CLAUDE.md                      imports AGENTS.md for Claude Code (must be at the root)
.claude/commands/              slash-command wrappers for the prompts (must be at the root)
docs/
  CONTEXT-KIT.md               this file
  context/
    product.md                 what, for whom, non-goals, glossary
    architecture.md            boundaries, request path, tenancy, auth, data
    tech.md                    stack, versions, verified commands, config, environments
    conventions.md             cross-stack rules and index of profiles
    profiles/                  dotnet, node-ts, react, angular, sql (keep what applies)
  decisions/                   ADRs, append-only
  specs/
    _template/                 spec.md, design.md, tasks.md
  prompts/                     onboard, spec, plan, implement, review
```

The repo root gains two visible files. Everything else sits under `docs/`.

## Install

1. Copy `AGENTS.md`, `CLAUDE.md`, and `.claude/` to the repo root, and merge the kit's
   `docs/` folder into the repo's `docs/` folder. If the repo already has an `AGENTS.md`,
   a `CLAUDE.md`, or files under `.claude/commands/` with the same names, merge by hand
   instead of overwriting.
2. Existing project: run `/onboard` and answer the questions it ends with.
   New project: fill `product.md` and `architecture.md` by hand, write the first two or
   three ADRs, then fill `tech.md` once the skeleton builds.
3. Delete the profiles that do not apply.
4. Commit as one PR titled `docs: add project context kit`.

Agents other than Claude Code read `AGENTS.md` directly. For those, paste the matching
file from `docs/prompts/` as the instruction, or wire it into that tool's own command system.

## The loop

| Step | Command | Output | Who approves |
|---|---|---|---|
| Specify | `/spec <description>` | `docs/specs/NNN-name/spec.md` | Owner sets status to `approved` |
| Plan | `/plan NNN` | `design.md`, `tasks.md`, ADR if needed | Owner reads the design |
| Build | `/implement NNN` | Code, tests, updated docs | Tests and verification steps |
| Review | `/review NNN` | Findings against spec and rules | Human reviewer |

## Tiers

| Tier | When | Artifacts |
|---|---|---|
| 0 | Bug fix, copy, dependency bump, refactor with no behaviour change | None |
| 1 | New behaviour inside one module, no schema or contract change | `spec.md` |
| 2 | Crosses modules, or changes schema, public API, auth, tenancy, billing | `spec.md`, `design.md`, `tasks.md`, ADR |

If specs are being written after the code, the tier is too high. Drop a tier.

## Keeping it true

One rule: a PR that changes behaviour, a boundary, a command, or a decision updates the
matching doc in the same PR. The `/review` prompt checks for this.

Each context file has a "Last verified" line. Re-run `/onboard` when it is older than three months.

Only document what the code cannot tell you: intent, boundaries, reasons, and traps.

## Several repos, one product

Pick one repo as the home of shared context (`product.md`, shared parts of
`architecture.md`, `docs/decisions/`). Every other repo keeps:

- its own `AGENTS.md` with its commands and non-negotiables
- its own `tech.md` and the profiles it uses
- one line in `AGENTS.md` pointing to the shared context repo and path

Do not copy shared files between repos. Copies drift.

## Using it as Claude Project knowledge

Add `AGENTS.md`, `docs/context/`, and `docs/decisions/` to the Project. Leave `docs/specs/`
out except the one in progress. Use the body of `AGENTS.md` as the Project instructions.

## Pilot checklist (one week)

- [ ] Kit copied in and `/onboard` run
- [ ] Open questions from `/onboard` answered, `UNKNOWN` items resolved or accepted
- [ ] Three to five retrospective ADRs written
- [ ] One real tier 1 or tier 2 change taken through the full loop
- [ ] Notes on what was unused, wrong, or too heavy
- [ ] Unused sections deleted from the templates
