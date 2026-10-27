# /implement <spec number> [task id]

Goal: implement the tasks for an approved spec, one at a time, each verified before the next.

## Rules

- The spec must be `approved`, and a Risky spec must show Madushan's approval in its Approval
  table. Otherwise stop and say what is missing.
- Work only from `docs/specs/<NNN>-<name>/`. If there is no `tasks.md`, work from the acceptance
  criteria in order.
- One task at a time. Do not start the next task until the current one is verified.
- Stay in scope. If you notice something unrelated that needs fixing, note it under
  "Deviations" as a follow-up and leave it.
- Follow the stack profile for the area you are editing and match the surrounding code.
- If the plan turns out to be wrong, stop, explain, and update `design.md` and `tasks.md`
  before continuing. Do not quietly do something different.
- Database changes: a new numbered `migrations/` file, additive and backward compatible, with
  `shared/schema.ts` updated. Restart the dev server to apply it, then check `npm run db:status`.

## Steps for each task

1. Read the task, the files it names, and the acceptance criteria it covers.
2. Write or extend the test script for the area first where that is practical.
3. Make the change.
4. Run the task's verification, then `npm run check`, `npm run build` and the affected test
   scripts (`AGENTS.md`). Paste the result summary.
5. If verification fails, fix the cause. Do not weaken or delete a test, validation or
   permission check.
6. Tick the task in `tasks.md`.

## After the last task

1. Run `npm run check`, `npm run build`, the test scripts for every touched area, and
   `npm run db:status` (nothing pending).
2. Complete the "Final check" section of `tasks.md`.
3. Update `docs/context/`, `docs/decisions/` (and its index), and `.agents/memory/` for anything
   that changed: a boundary, a command, a setting, a table convention, a decision, a trap.
4. Write `verification.md` from the template, ending with **Ready to publish: Yes / No**.
5. Set the spec status to `done`, and send the requester the "Summary for Sudeshi".
6. Do not publish.

## Stop and ask when

- A change would touch ownership checks, authentication, money, personal data, or a migration
  that drops, renames or rewrites data, and the spec did not say so.
- An acceptance criterion cannot be met as written.
- You need a new dependency, secret, environment variable or production setting.
