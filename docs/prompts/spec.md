# /spec <short description of the change>

Goal: produce `docs/specs/<NNN>-<kebab-name>/spec.md` that the requester can approve or reject
in five minutes. Usually called from `docs/prompts/request.md` step 3.

## Rules

- Describe the problem and the required behaviour. Do not design the solution here.
- Do not write or change code in this run.
- Ask before you assume. Batch your questions: at most five, each answerable in one line,
  in plain language.
- Use the glossary terms from `docs/context/product.md`.

## Steps

1. Read `AGENTS.md`, `docs/context/product.md`, and the parts of `docs/context/architecture.md`
   that the change touches. Skim the relevant code so the spec matches reality.

2. Confirm the category (Small fix, Feature, Risky) using the table in `AGENTS.md`. State it
   and the reason. A Small fix needs no spec: stop and say so.

3. Check the request against `product.md` (business rules, non-goals) and existing ADRs. If it
   conflicts, stop and raise the conflict in plain words.

4. Ask your clarifying questions and wait for answers. If nobody can answer, record them under
   "Open questions" and leave the status as `draft`.

5. Pick the next free number, copy `docs/specs/_template/spec.md`, and fill it:
   - The **Plain-language summary** first: what changes for customers, vendors and admins,
     what stays the same, whether data, money, logins or personal data are affected.
   - Acceptance criteria in the WHEN / THE SYSTEM SHALL form, each independently testable.
   - Include the failure and permission cases, not only the happy path.
   - Fill every row of the Constraints table. Write "none" where that is true.
   - Keep "Out" honest. List what a reader might wrongly expect to be included.

6. Self-check before presenting:
   - Could a tester write a test from each criterion without asking anything?
   - Does any criterion describe implementation instead of behaviour? Rewrite it.
   - Is the change small enough for one task? If not, propose a split into numbered specs.

## Output

The spec file with `Status: awaiting approval`, then the plain-language summary for the
requester. For a Risky change, add the "For Madushan" message from `docs/prompts/request.md`.
