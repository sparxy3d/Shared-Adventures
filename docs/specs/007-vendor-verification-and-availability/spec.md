# Vendor verification and taking bookings

Status: approved

The user's Stage 1 specification is approved for implementation.

- Application: multi-select group sizes 1, 2, 3-5, 6+; separate website, Instagram and maps links, at least one required.
- Mandatory ID, optional police report and business registration. PDF/JPG/PNG, 10 MiB per document. Clear validation and privacy copy.
- Private document contents available only to authenticated admins. Vendors receive document status only. Admin deletion requires confirmation and records actor and time.
- Vendor dashboard Taking bookings toggle. Offline listings are excluded from discovery; direct detail remains readable with an offline message and no booking action. New bookings are rejected server-side; existing bookings remain unchanged.
- Admin vendor list displays taking-bookings status.
- Development-only schema changes. No publishing, seed or ENABLE_SEED changes. No user-facing em dashes.
- Verify upload limits, permissions, offline booking rejection, typecheck/build, and desktop/phone UI.
