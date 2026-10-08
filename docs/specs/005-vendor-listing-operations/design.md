# Design and contracts

Use existing `VendorRoute`, `RequireRole`, `useAuth`, Stage 4 shell and styles;
Stage 2 activity card and `formatPrice`. No additional current-user query.

Existing vendor CRUD:
`GET/POST /api/vendor/experiences`, `GET/PATCH /api/vendor/experiences/:id`,
`GET/POST /api/vendor/experiences/:id/slots`, `DELETE /api/vendor/slots/:id`,
`GET/PATCH /api/vendor/profile`, `GET /api/vendor/bookings`.

New vendor-owned, zod-validated operations:
- `POST /api/vendor/experiences/:id/generate-sessions`:
  `{pattern:[{weekday:0..6,startTime:"HH:MM",capacity}],days:1..60}`;
  response `{created}`. Sunday=0; tomorrow through requested horizon.
- `POST /api/vendor/experiences/:id/close-day`: `{date,reason}`;
  response `{removed,kept,reason}`. Only future, open, unbooked sessions removed.

Vendor listing validation remains draft/published. Admin validation accepts the
catalog's unpublished status. Vendor PATCH rejects any actual status change
from unpublished with `Unpublished by Free Spirit — contact us`.
Publishing is additionally checked for a curated photo and upcoming open session
on the server; creation must first be saved as draft to obtain a schedule.

Generation serializes on the experience row and checks existing keys. Safe
deletion locks affected slots and checks requested/confirmed bookings. Inactive
historical links are detached without changing their date/start snapshots.
No automatic updates/deletions during generation.

Stats: requests grouped by received timestamp in Sri Lanka time; confirmed/
completed count and value of those requests. Missing timestamps/totals must be
reported as unavailable, not invented. Weekly buckets are calendar weeks
intersecting the selected month.

Application block is preserved verbatim when updating about text; website and
terms may remain read-only. Pattern storage is scoped by vendor/listing IDs.

