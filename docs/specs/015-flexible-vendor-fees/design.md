# Design

Reuse the existing three-part vendor fee plan and commissionForVendor calculation.
Zero already survives nullish fallback and integer booking commission arithmetic;
no financial calculation or schema change is needed.

Tighten shared HTTP fee validation to 0..30 and months to 0..12, retaining strict
schemas, admin guards and two-decimal validation. Both rates use the same range.
Existing values outside these limits are not silently rewritten. New edits must
meet the new bounds. Defaults are not changed.

The vendor dashboard uses the effective fee for legacy flat overrides, and the
agreed plan for introductory copy. Zero months always means standard fee,
including before the first publication. Dates remain in Sri Lanka time.

Test through actual HTTP handlers and SQL in a disposable development schema,
including its own migration-managed session table. Serve the built client through
that isolated server for authenticated browser checks, without seed or startup writes.
