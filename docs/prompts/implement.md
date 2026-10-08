# /implement <spec number> [task id]

Goal: implement the tasks for an approved spec, one at a time, each verified before the next.

## Rules

- Work only from `docs/specs/<NNN>-<name>/`. If there is no `tasks.md`, work from the acceptance criteria in order.
- One task at a time. Do not start the next task until the current one is verified.
- Stay in scope. If you notice something unrelated that needs fixing, note it under
  "Deviations" as a follow-up and leave it.
- Follow the stack profile for the area you are editing and match the surrounding code.
- If the plan turns out to be wrong, stop, explain, and update `design.md` and `tasks.md`
  before continuing. Do not quietly do something different.

## Steps for each task

1. Read the task, the files it names, and the acceptance criteria it covers.
2. Write or update the test first where that is practical.
3. Make the change.
4. Run the task's verification, then build, lint, and the affected tests. Use the commands
   in `AGENTS.md`. Paste the result summary.
5. If verification fails, fix the cause. Do not weaken or delete the test, and do not
   suppress the lint rule, unless the owner agrees.
6. Tick the task in `tasks.md`.

## After the last task

1. Run the full build, lint, and test suite.
2. Complete the "Final check" section of `tasks.md`.
3. Update `docs/context/` and `docs/decisions/` for anything that changed: a boundary, a
   command, a config key, a table convention, a decision.
4. Set the spec status to `done`.
5. Draft the PR description: link to the spec, what changed, and how each acceptance
   criterion was verified.

## Stop and ask when

- A change would touch tenancy enforcement, authentication, or a migration that drops or rewrites data.
- An acceptance criterion cannot be met as written.
- You need a new dependency or a new environment variable.
