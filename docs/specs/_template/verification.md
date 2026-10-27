# Verification: <NNN> <Feature name>

Spec: `./spec.md`

## Summary for Sudeshi

<Three to six plain sentences: what changed for customers, vendors and admins, what to look at
when testing, and anything that behaves differently from before. No technical terms.>

**Ready to publish: Yes / No**
<If No: exactly what is missing and who must do it, for example "Madushan must add the
PAYHERE_MERCHANT_ID secret to the deployment".>

## Acceptance criteria

| Criterion | How it was verified | Result |
|---|---|---|
| AC1 | <test script and case, or manual check with steps> | Pass / Fail |

## Commands run

| Command | Result |
|---|---|
| `npm run check` | <pass/fail> |
| `npm run build` | <pass/fail> |
| `npm run db:status` | <all applied / pending: ...> |
| `<test scripts for the touched areas>` | <pass/fail, counts> |

## Database

- New migration files: <none / `migrations/NNN_name.sql`: what it adds>
- Additive and backward compatible: <yes / explain>
- Data changed in existing rows: <none / what and why>

## Production needs

- New secrets or environment variables: <none / names>
- Manual steps before or after publishing: <none / steps and who does them>

## Changed files

<List, grouped by server, client, schema/migrations, tests, docs.>

## Deviations and follow-ups

<Anything done differently from the spec or design, skipped, or noticed for later.>
