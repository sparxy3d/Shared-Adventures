# Tasks: <NNN> <Feature name>

Spec: `./spec.md` | Design: `./design.md`

Rules:

- Tasks are ordered. Each one leaves the build green.
- Each task is small enough to review on its own, roughly under 200 changed lines.
- Each task names how it is verified. "It compiles" is not verification.
- Tick a task only after its verification has passed. Record anything skipped at the bottom.

## Tasks

- [ ] T1. <What changes>
  - Files: `<path>`
  - Covers: AC1
  - Verify: `<command or manual check and the expected result>`

- [ ] T2. <What changes>
  - Files: `<path>`
  - Covers: AC2, AC3
  - Depends on: T1
  - Verify: `<...>`

- [ ] T3. Update docs
  - Files: `docs/context/<file>`, `docs/decisions/<file>`
  - Verify: every changed boundary, command, or decision is reflected

## Final check

- [ ] All acceptance criteria covered by a passing test or a recorded manual check
- [ ] Build, lint, and full test suite pass
- [ ] Migration applied and rolled back once locally
- [ ] Spec status set to `done`

## Deviations

<Anything done differently from the design, or skipped, with the reason.>
