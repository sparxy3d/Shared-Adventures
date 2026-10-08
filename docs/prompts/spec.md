# /spec <short description of the change>

Goal: produce `docs/specs/<NNN>-<kebab-name>/spec.md` that a reviewer can approve or reject in five minutes.

## Rules

- Describe the problem and the required behaviour. Do not design the solution here.
- Do not write or change code in this run.
- Ask before you assume. Batch your questions: at most five, each answerable in one line.
- Use the glossary terms from `docs/context/product.md`.

## Steps

1. Read `AGENTS.md`, `docs/context/product.md`, and the parts of `docs/context/architecture.md`
   that the change touches. Skim the relevant code so the spec matches reality.

2. Choose the tier using the table in `AGENTS.md`. State the tier and the reason. If it is
   tier 0, stop and say no spec is needed.

3. Check the request against the non-goals in `product.md` and against existing ADRs. If it
   conflicts, stop and raise the conflict.

4. Ask your clarifying questions and wait for answers. If the owner is not available,
   record them under "Open questions" and leave the status as `draft`.

5. Pick the next free number, copy `docs/specs/_template/spec.md`, and fill it:
   - Acceptance criteria in the WHEN / THE SYSTEM SHALL form, each independently testable.
   - Include the failure and permission cases, not only the happy path.
   - Fill every row of the Constraints table. Write "none" where that is true.
   - Keep "Out" honest. List what a reader might wrongly expect to be included.

6. Self-check before presenting:
   - Could a tester write a test from each criterion without asking anything?
   - Does any criterion describe implementation instead of behaviour? Rewrite it.
   - Is the change small enough for one PR? If not, propose a split into numbered specs.

## Output

The spec file, then a three-line summary: tier, number of acceptance criteria, open questions.
Status stays `draft` until the owner sets it to `approved`.
