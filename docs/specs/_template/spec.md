# <NNN> <Feature name>

- Status: draft | awaiting approval | approved | in progress | done | dropped
- Category: Feature (tier 1) | Risky (tier 2)
- Requested by: <name>
- Created: <YYYY-MM-DD>

## Plain-language summary

<For the requester and approver. Four to eight short sentences, no technical terms:
what changes for customers, vendors and admins; what stays the same; whether the database,
money, logins, permissions or personal data are affected; and the main risk.>

## Approval

| Who | Decision | Date | Their words |
|---|---|---|---|
| <Sudeshi or Madushan; Madushan for Risky> | <approved / changes requested> | <YYYY-MM-DD> | "<as given>" |

Risky changes need Madushan's approval in this table before any code changes.

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
| Ownership | <whose data is touched (customer, vendor, admin), and how a vendor is kept out of another vendor's data> |
| Authorization | <who may do this, checked on the server> |
| Data and migrations | <new or changed tables or columns (a new `migrations/` file), retention, audit; "none" if no database change> |
| Money | <prices, commission, totals affected; "none" otherwise> |
| Personal data | <what personal or ID data is touched and who can see it; "none" otherwise> |
| Production needs | <new secrets, settings or manual steps; "none" otherwise> |
| Compatibility | <existing data, pages and links that must keep working> |

## Open questions

Resolve all of these before status becomes `approved`.

- [ ] <question> (owner: <name>)

## Notes

<Links, screenshots, prior discussion.>
