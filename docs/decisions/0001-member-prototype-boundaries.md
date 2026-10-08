# Member prototype boundaries

Status: accepted, 2026-10-08

Home city stays in browser storage. Account deletion and forgotten passwords
use support email, clearly labelled as prototype flows. No new schema, reset
tokens, email integration or account-deletion endpoint is introduced.

**Why:** Stage 1 explicitly forbids schema changes and limits server work to
authenticated password replacement. Implementing actual deletion/reset would
require additional security, retention and delivery decisions outside this stage.

Next destinations must be local paths; role homes override them for vendors/admins.
This avoids external redirects while preserving member return-to-page behavior.
