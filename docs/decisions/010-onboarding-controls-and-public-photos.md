# Onboarding controls and public photos

Use explicit persisted settings and account flags, not password-prefix guesses
or frontend-only controls. Serialize settings with booking creation so closing
bookings prevents later requests while preserving existing bookings.

Public listing photos use App Storage under a listing-only prefix and
metadata-free WebP variants served through an API that respects demo visibility.
Private verification document storage and routes are unchanged. Storage failures
must be explicit; never persist uploads to the development filesystem.

Existing listing images remain valid. New vendors/listings default non-demo;
only a one-time reviewed migration marks known demo owners and existing listings.
Superseded by ADR 013: production schema changes use immutable tracked startup
migrations, after the one-time legacy baseline. No db:push or hand-applied SQL.
