# /review [spec number | branch | PR]

Goal: review a change against its spec and the repo rules before a human spends time on it.
Run this in a fresh session that did not write the change.

## Rules

- Report only findings you have confirmed by reading the code. No speculation.
- Every finding names the file and line, the concrete failure it causes, and the fix.
- Do not rewrite the change. Review it.
- Skip style points that the linter or formatter already enforces.

## Steps

1. Read the diff, the spec folder, `AGENTS.md`, and the stack profile for each area touched.

2. Spec conformance. For each acceptance criterion: is it implemented, and which test proves
   it? List any criterion with no test. List any behaviour in the diff that the spec does not ask for.

3. Check, in this order:
   1. Tenancy and ownership: every new or changed query, endpoint, job, and cache key is
      scoped to its owner (tenant, vendor, or customer, as `AGENTS.md` defines it), and the
      owner identity comes from the server-side session or token, never from the request.
   2. Authorization: every new operation checks permission on the server.
   3. Input validation at every boundary, including LLM output and file uploads.
   4. Data: migrations are reversible, safe under load, and match the design. No data loss on rollback unless stated.
   5. Error handling: failures are handled at the right level and do not leak internals.
   6. Concurrency and idempotency for anything retried, queued, or run in parallel.
   7. Performance: N+1 queries, unbounded result sets, missing indexes for new filters.
   8. Secrets and personal data in code, logs, or tests.
   9. Tests: they assert behaviour, fail for the right reason, and cover the failure cases.
   10. Docs: `docs/context/` and ADRs updated where the change requires it.

4. Run build, lint, and tests if you can. Report the result.

## Output

```
Verdict: approve | approve with changes | request changes

Blocking
- <file:line> <defect> -> <fix>

Should fix
- <file:line> <defect> -> <fix>

Spec coverage
- AC1: <test name or MISSING>

Docs to update
- <file and what to change>
```

If there are no blocking findings, say so plainly. Do not invent findings to fill the sections.
