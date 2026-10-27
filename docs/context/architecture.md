# Architecture context

Last verified: 2026-10-27 (kit refresh by Claude against `main` at `41e6f9f`, reading
`server/routes.ts`, `server/storage.ts`, `server/index.ts`, `server/migrations.ts`,
`server/listing-photos.ts`, `server/onboarding-routes.ts` and `client/src/App.tsx`)

Only what the code cannot tell you quickly: boundaries, the request path, where ownership is
enforced, and the traps.

## System in one picture

```
Browser (React SPA, wouter routes in client/src/App.tsx)
   │  fetch /api/*  (cookie: connect.sid, credentials: include)
   ▼
Express, one process on PORT  ── server/index.ts
   boot order: tracked migrations (advisory lock) → seed gate (ENABLE_SEED) → routes → listen
   ├─ JSON parser; request log of method, path, status and duration only
   ├─ express-session (Postgres "session" table from migration 013)
   ├─ guards: /api/admin → requireAdmin, /api/vendor → requireVendor,
   │          temporary-password accounts → 403 PASSWORD_CHANGE_REQUIRED on other APIs
   ├─ server/routes.ts, onboarding-routes.ts, listing-photos.ts   (HTTP, validation, ownership)
   │     └─ server/storage.ts   DatabaseStorage: every query, row locks, booking transaction
   │            └─ server/db.ts  pg.Pool + drizzle (Neon DEV or PROD)
   ├─ Replit App Storage: listing photo variants (DEV or PROD bucket)
   ├─ dev:  Vite middleware (server/vite.ts)
   └─ prod: static dist/public, with SPA fallback (server/static.ts)
```

## Components

| Component | Responsibility | Must not |
|---|---|---|
| `migrations/`, `server/migrations.ts` | Numbered SQL, applied once each, recorded in `schema_migrations` with a checksum | Be edited after applying |
| `shared/schema.ts` | Tables, inferred types, zod insert schemas, matching the migrations | Contain logic |
| `shared/pricing.ts` | Booking totals (resident LKR, visitor USD converted to LKR) and commission selection | Read the database |
| `server/routes.ts` and the other route files | HTTP, auth, validation, ownership checks | Hold SQL. Queries go in `storage.ts` |
| `server/storage.ts` | All database access and transactions | Know about `req` or the session |
| `server/seed.ts` | Demo data and demo upgrades, only with `ENABLE_SEED=true` | Run in production, or change schema |
| `client/src/pages/*` | One file per route. Vendor and admin areas in subfolders | Make authorization decisions. The server decides |

## Ownership model

There is no multi-tenancy. The isolation boundary is ownership, enforced on the server:

| Data | Owner | Enforced by |
|---|---|---|
| Vendor business, listings, sessions, vendor bookings | vendor (`vendors.owner_profile_id`) | `requireVendor` puts the session user's vendor in `res.locals.vendor`; handlers check `experience.vendorId === vendor.id` |
| Bookings, favorites, profile | customer (`customer_profile_id`) | Queries filtered by the session user |
| Verification documents | admin only | `/api/admin/...`; vendors see "Uploaded" status only, never contents or ids |
| Everything else | admin | `requireAdmin` on `/api/admin` |

Roles are in `users.role`: `customer` (default), `vendor`, `admin`, with a disabled prefix for
switched-off accounts. A customer becomes a vendor only when an admin approves their
application or creates the vendor.

## Authentication

- Email and password, scrypt with a 16-byte salt (`hex.salt`), compared with `timingSafeEqual`.
- Server-side sessions in Postgres, 30-day cookie, `httpOnly`, `sameSite: lax`, `secure` and
  `trust proxy` in production. Login regenerates the session.
- Login limiter: 10 attempts per 15 minutes per IP and email, held in memory.
- Temporary passwords (application approval, admin-created accounts, resets) set
  `must_change_password`; such sessions can only change the password or log out.

## Key flows

- **Discovery** shows listings that are `published`, whose vendor is `approved` and taking
  bookings, and hides demo vendors and listings unless `site_settings.show_demo_content` is on.
- **Booking request**: one transaction locks the listing, vendor and session, refuses when
  bookings are closed (`site_settings.bookings_open`), the vendor is offline, the listing is
  hidden demo content or the session is full or past, then takes the spots and stores a
  financial snapshot (counts, unit prices, exchange rate, commission rate, commission,
  vendor net). Snapshots are never rewritten.
- **Commission**: vendor fee plan (introductory rate, months, standard rate) or the global
  `pricing_settings`, with introductory time counted from first publication (ADR 012).
- **Vendor application**: public form with up to ten activities and identity documents.
  Approval creates the vendor's draft listings in the same transaction.
- **Listing photos**: uploads are resized to 1600, 800 and 400 px WebP without metadata and
  stored in App Storage under `listing-photos/<uuid>/`. `/api/listing-images/:id/:width.webp`
  checks the listing is public, or the viewer owns it or is an admin.

## Data

- Tables: `users`, `countries`, `vendors`, `experiences`, `experience_images`,
  `availability_slots`, `bookings`, `favorites`, `reviews`, `vendor_documents`,
  `pricing_settings`, `site_settings`, `waiting_list`, `session`, `schema_migrations`.
- Primary keys are `serial`. Foreign keys are declared, with no cascade rules.
- Status values (free text, validated by zod in routes):
  - experiences: `draft`, `published`, `unpublished` (set by admin)
  - vendors: `pending`, `contacted`, `approved`, `paused`, `rejected`
  - bookings: `requested`, then `confirmed` or `declined`; `confirmed` then `cancelled` or
    `completed` (admin)
  - slots: `open`, `full`
- Dates are `YYYY-MM-DD` text and times `HH:MM` text, in Sri Lanka time.
- Money: whole LKR in `price_amount`, `total_amount` and `*_lkr` columns; whole USD in
  `visitor_price_usd` and `usd_unit_price`; rates as `numeric(5,2)` percentages.
- Verification documents: `vendor_documents.contents` is `bytea`, at most 10 MB, never selected
  outside the admin download. Deletion nulls the contents and keeps who and when (ADR 007).
- Schema changes: new numbered files in `migrations/` only (ADR 013).

## Integrations

- Replit App Storage for listing photos. No payment gateway yet (PayHere is planned), and
  no email, SMS, maps or analytics.

## Cross-cutting concerns

- Errors: 4xx responses carry a message; 500 responses return a generic message and the
  detail goes to the server log.
- Logging: method, path, status and duration only. Never response bodies or personal data.
- Time: `server/time.ts` (`colomboToday`, `colomboNowHHMM`) on the server and
  `client/src/lib/discovery.ts` on the client.

## Known debt and sharp edges

Confirmed by reading the code on 2026-10-27. Ordered by risk.

1. **Demo accounts with public passwords exist in production** (`@freespirit.com`, passwords in
   `product.md`). Kept on purpose for sales demos. The demo admin can see vendor documents,
   so change its password before real vendors apply in volume.
2. **Anonymous vendor application uploads are not rate-limited.** Each request can buffer up to
   30 MB in memory and store it in Postgres.
3. **In-memory rate limiters** (login, waiting list) reset on restart and are per instance under
   autoscale.
4. **`SESSION_SECRET` fallback** to a hard-coded string if the secret is missing.
5. **Prototype shortcuts in `vendors.description`**: decline reasons and approval dates are
   appended to the description text instead of their own columns.
6. **Photo uploads are not atomic across storage and database.** Failures clean up best effort.
7. **Binds to `127.0.0.1`.** Must change before hosting anywhere but Replit.
8. **No automated tests in CI.** The test scripts need a database, so they run in Replit only.
9. **Large client bundle** (about 600 kB, Vite warning) and 1.5 to 2.4 MB curated PNGs without
   responsive variants.
