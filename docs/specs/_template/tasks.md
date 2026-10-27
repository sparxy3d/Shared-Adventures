# Tasks: <NNN> <Feature name>

Spec: `./spec.md` | Design: `./design.md`

Rules:

- Tasks are ordered. Each one leaves the build green.
- Each task is small enough to review on its own, roughly under 200 changed lines.
- Each task names how it is verified. "It compiles" is not verification.
- Tick a task only after its verification has passed. Record anything skipped at the bottom.
- Order: migration and schema, then server, then client, then docs.

## Tasks

- [ ] T1. <Migration, if the database changes>
  - Files: `migrations/<NNN>_<name>.sql`, `shared/schema.ts`
  - Covers: <ACs>
  - Verify: restart the dev server, then `npm run db:status` shows the file applied

- [ ] T2. <What changes>
  - Files: `<path>`
  - Covers: AC1
  - Depends on: T1
  - Verify: `<command or manual check and the expected result>`

- [ ] T3. Update docs
  - Files: `docs/context/<file>`, `docs/decisions/<file>`, `.agents/memory/<note>`
  - Verify: every changed boundary, command, setting or decision is reflected

## Final check

- [ ] All acceptance criteria covered by a passing test or a recorded manual check
- [ ] `npm run check`, `npm run build` and the touched test scripts pass
- [ ] New migration is additive, applied in development, and `npm run db:status` shows nothing pending
- [ ] No applied migration file was edited
- [ ] `verification.md` written, ending with Ready to publish: Yes / No
- [ ] Spec status set to `done`

## Deviations

<Anything done differently from the design, or skipped, with the reason.>
