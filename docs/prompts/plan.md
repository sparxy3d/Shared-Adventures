# /plan <spec number>

Goal: turn an approved spec into `design.md` and `tasks.md` in the same spec folder.
Tier 2 needs both. Tier 1 needs `tasks.md` only when the work is more than about half a day.

## Rules

- The spec must have status `approved` and no open questions. Otherwise stop and say so.
- Do not write or change production code in this run.
- Reuse what exists. Search for an existing pattern before proposing a new one, and name
  the file you are copying the pattern from.
- Prefer the smallest design that meets the acceptance criteria. List anything you
  deliberately left out.

## Steps

1. Read the spec, `docs/context/architecture.md`, `docs/context/conventions.md`, the stack
   profile for each area you will touch, and any related ADRs.

2. Read the code you will change. List the files and the existing patterns you will follow.

3. Write `design.md` from `docs/specs/_template/design.md`:
   - At least one real alternative, with the reason it lost.
   - Migration and rollback steps that someone else could execute.
   - For every new data path, state how tenant isolation and authorization are enforced.
   - Map every acceptance criterion to a test in the test strategy table.

4. If the design makes a choice that is costly to reverse, draft an ADR from
   `docs/decisions/0000-template.md` with status `proposed`.

5. Write `tasks.md` from `docs/specs/_template/tasks.md`:
   - Order tasks so each leaves the build green: schema, then domain, then API, then UI, then docs.
   - Each task lists its files, the criteria it covers, and a concrete verification.
   - Put the test in the same task as the code it tests.

6. Self-check:
   - Every acceptance criterion appears in at least one task.
   - No task depends on a later task.
   - Nothing in the design contradicts `AGENTS.md` non-negotiables or an accepted ADR.

## Output

The files written, then: the riskiest part of the plan in one sentence, and any decision
the owner must make before implementation starts.
