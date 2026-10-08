# Device-local weekly patterns and insert-only sessions

Status: accepted — user-mandated prototype shortcut, 8 October 2026.

Weekly patterns live in browser storage, scoped to vendor and listing, with a
visible device-local label. Existing upcoming slots provide an initial pattern.
Sessions generated from it are real database records, not a recurring rule.

**Why:** Stage 5 explicitly forbids schema changes; a persistent recurring
schedule would need separate schema/design approval.

Generation serializes by listing, checks existing date/start keys and inserts
only absent sessions. Closing a day or deleting a session never removes
requested/confirmed reservations and does not touch past sessions. Profile
editing preserves the application audit block rather than rewriting consent.
