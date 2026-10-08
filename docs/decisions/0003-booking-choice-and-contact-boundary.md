# Booking choice and contact boundary

Status: accepted.

## Decision
Keep selected slot, exact group quantity and request-panel state in the activity
URL. Send no identity, dates, prices, currency or status in create-booking input.
Reveal contact/address fields only in the session owner's confirmed-booking
projection; null them for every other status. Guest UI is OFF and never sends
unauthenticated requests, even when the UI flag is enabled.

## Why
Authentication navigation must not lose a member's choices. The server alone
sets ownership/prices and reserves availability. Contact release must not depend
on client-side hiding, and guest support is explicitly a pending decision.
