# ADR 016: Flexible agreed vendor fee plans

Status: accepted in the approved flexible-fees request.

## Decision

Public terms must not promise the global default percentages or introductory length.
Each vendor's agreed three-part plan controls their dashboard and new bookings.
An introductory fee of zero is valid; zero months bypasses introduction.
New admin-entered rates are 0..30%, introductory periods 0..12 months.
The existing defaults, historical plans and booking snapshots are not backfilled.

## Why

The owner requires negotiated vendor offers, including a fee-free introduction.
Changing defaults or wording must never change an existing booking's stored fee.

## Consequences

Existing columns and calculations suffice. No migration is required.
An out-of-range historical plan remains effective until explicitly replaced
with a valid plan, rather than being silently changed by this release.
The 15% worked example remains illustrative, not a promised standard rate.
