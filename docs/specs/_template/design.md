# Design: <NNN> <Feature name>

Tier 2 only. Spec: `./spec.md`

## Approach

<The chosen approach in one paragraph, naming the components that change.>

## Alternatives considered

| Option | Why not |
|---|---|
| <...> | <...> |

If an alternative was a close call or is costly to reverse, record it as an ADR and link it here.

## Changes by component

| Component | Change | Files or modules |
|---|---|---|
| <...> | <...> | `<path>` |

## Data model

<New or changed tables, columns, indexes, constraints. Include the tenant column and audit columns.>

### Migration and rollback

- Forward: <steps, and whether it is safe to run while the old code is live>
- Backfill: <needed or not, size, how it is batched>
- Rollback: <exact steps, and what data would be lost>

## Contracts

<New or changed endpoints, events, or message shapes. Request, response, error cases, status codes. State whether the change is backward compatible.>

## Security and tenancy

- Tenant resolution and enforcement for every new data path: <...>
- Permission checks added: <...>
- New sensitive data and how it is protected: <...>

## Failure modes

| What can fail | Effect | Handling |
|---|---|---|
| <...> | <...> | <retry, fallback, surface to user> |

## Observability

<Logs, metrics, or audit entries added, and how you would tell in production that this is working.>

## Test strategy

| Acceptance criterion | Test type | Where |
|---|---|---|
| AC1 | unit / integration / e2e / manual | `<path>` |

## Risks

- <risk, likelihood, mitigation>
