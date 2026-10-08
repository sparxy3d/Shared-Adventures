# <NNN> <Feature name>

- Status: draft | approved | in progress | done | dropped
- Tier: 1 | 2
- Owner: <name>
- Created: <YYYY-MM-DD>
- Tracking: <work item or issue link>

## Problem

<Who has the problem, what it costs them today, and why it is worth solving now. Three to five sentences. No solution yet.>

## Outcome

<The observable result when this is done, in one sentence.>

## Scope

In:

- <...>

Out (explicitly not part of this change):

- <...>

## Scenarios

| # | As a | I want to | So that |
|---|---|---|---|
| S1 | <role> | <action> | <benefit> |

## Acceptance criteria

Each criterion is testable and numbered. Use the form: WHEN <trigger> [AND <condition>] THE SYSTEM SHALL <response>.

- AC1. WHEN <...> THE SYSTEM SHALL <...>.
- AC2. WHEN <...> AND <...> THE SYSTEM SHALL <...>.
- AC3. IF <failure condition> THEN THE SYSTEM SHALL <...>.

## Constraints

| Area | Requirement |
|---|---|
| Tenancy | <which tenant data is touched, and how isolation holds> |
| Authorization | <who may do this> |
| Data | <new or changed entities, retention, audit> |
| Performance | <volume and response expectations> |
| Compatibility | <existing clients, API versions, data that must keep working> |

## Open questions

Resolve all of these before status becomes `approved`.

- [ ] <question> (owner: <name>)

## Notes

<Links, screenshots, prior discussion.>
