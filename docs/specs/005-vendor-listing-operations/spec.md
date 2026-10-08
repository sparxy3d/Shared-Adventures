# Stage 5 — vendor listing operations

Status: approved

Approval: the user's Stage 5 implementation request, 8 October 2026.
Tier: 2; this changes vendor API contracts and booking/session safeguards.

Scope: listings, editor, schedule, stats and business profile in the Stage 4
shell. Existing stack, whole LKR and five catalog categories. No schema, seed,
startup, environment or deployment changes. Keep ownership and role guards.

Acceptance:
- Listings show actual status/next session, draft duplication and preview.
- Editor supports all requested fields, 60-character title, curated photo,
  draft saving, unsaved confirmation and session/photo publish requirements.
  Admin-unpublished listings cannot change status through vendor endpoints.
- Browser-only weekly pattern, seeded from real future slots; generate up to
  60 days from tomorrow in Sri Lanka time, insert-only by listing/date/start.
  Close-day/delete never remove requested/confirmed bookings or past sessions.
- Stats use real own bookings over six months, weekly counts and listing table.
- Profile preserves application metadata and terms; existing password endpoint.
- Old routes redirect, not duplicate the new editor/schedule/profile.
- Validate vendor1 flow at phone/desktop and vendor2 isolation, including
  publish, generate idempotency, booked-session deletion refusal and password.

