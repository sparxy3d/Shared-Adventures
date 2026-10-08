# Architecture context

Last verified: 2026-10-08 (/onboard run by Claude against `main` at `3f4195a`; owner review pending)

Only what the code cannot tell you quickly: boundaries, the request path, where ownership is
enforced, and the traps.

## System in one picture

```
Browser (React SPA, wouter routes)
   │  fetch /api/*  (cookie: connect.sid, credentials: include)
   ▼
Express, one process on PORT  ── server/index.ts
   ├─ JSON body parser, /api response logger
   ├─ express-session (store: Postgres "session" table, via connect-pg-simple)
   ├─ server/routes.ts      all endpoints, auth middleware, ownership checks inline
   │     └─ server/storage.ts   DatabaseStorage: every query, search filters
   │            └─ server/db.ts  pg.Pool + drizzle (Neon DEV or PROD)
   ├─ dev:  Vite middleware (server/vite.ts)
   └─ prod: static dist/public, with SPA fallback (server/static.ts)
Boot: if ENABLE_SEED=true, run server/seed.ts before routes are registered
```

## Components

| Component | Responsibility | Must not |
|---|---|---|
| `shared/schema.ts` | Tables, inferred types, zod insert schemas | Contain logic |
| `server/routes.ts` | HTTP, auth, ownership checks, server-side recomputation (price, slot validity) | Hold SQL. Queries go in `storage.ts` |
| `server/storage.ts` | All database access, through the `IStorage` interface | Know about `req` or the session |
| `server/seed.ts` | First-time demo data, plus idempotent upgrades and a rolling slot window | Run anything that is unsafe to repeat |
| `client/src/pages/*` | One file per route (see `App.tsx`). Vendor and admin areas are in subfolders | Make authorization decisions. The server decides |
| `client/src/lib/queryClient.ts` | `apiRequest` and the default query function (the query key is the URL) | — |

There is one server module and no service layer: handlers call `storage` directly.

## Request lifecycle (authenticated vendor write)

`PATCH /api/vendor/experiences/:id`:

1. `server/index.ts` parses JSON and starts the response logger.
2. `express-session` loads `req.session.userId` from the Postgres store.
3. `requireAuth` (`routes.ts`) returns 401 without a session.
4. The handler resolves `vendor = storage.getVendorByOwner(userId)`, loads the experience,
   and returns 403 unless `exp.vendorId === vendor.id`.
5. `storage.updateExperience(id, req.body)` runs a drizzle `UPDATE ... RETURNING`.
6. The JSON response is logged in full (see sharp edges) and returned.

## Ownership model (this app's tenancy)

There is no multi-tenancy. The isolation boundary is ownership:

| Data | Owner | Enforced by |
|---|---|---|
| Vendor profile | user (`vendors.owner_profile_id`) | `getVendorByOwner(session user)` |
| Experiences, slots | vendor (`experiences.vendor_id`, `availability_slots.experience_id`) | Inline check in each vendor handler |
| Bookings, favorites | customer (`customer_profile_id`) | Queries filtered by the session user |
| Everything | admin | `requireAdmin`, which loads the user and checks `role === "admin"` |

Roles live in `users.role` (`customer` default, `vendor`, `admin`). Creating a vendor
profile (`POST /api/vendor/profile`) promotes the caller to `vendor`. No middleware
requires the vendor role: vendor endpoints rely on `getVendorByOwner` returning a row.

## Authentication

- Email and password. scrypt with a 16-byte salt, stored as `hex.salt`, and compared with `timingSafeEqual`.
- Sessions are server-side in the Postgres `session` table (created automatically). The cookie
  lasts 30 days, `httpOnly`, `sameSite: lax`, `secure: false`.
- `GET /api/auth/me` is how the client learns who is signed in. Client role checks (for
  example `admin-dashboard.tsx`) only affect what is shown.

## Data

Tables (`shared/schema.ts`): `users`, `countries`, `vendors`, `experiences`,
`experience_images`, `availability_slots`, `bookings`, `favorites`, `reviews`, plus
`session` (owned by connect-pg-simple, not in the schema).

- Primary keys are `serial`. Foreign keys are declared, with no cascade rules.
- No soft delete and no `updated_at`. Only `created_at` on most tables.
- Status columns are free text with defaults, not enums:
  - experiences: `draft`, `published`
  - bookings: `requested`, then `confirmed` or `cancelled` (the vendor's Decline sets
    `cancelled`). `completed` has a badge colour, but no code sets it. The server
    accepts any status string a vendor sends.
  - vendors: `pending`, `approved`, `rejected`
  - slots: `open`
- `availability_slots.date` is `YYYY-MM-DD` text, and times are `HH:MM` text.
  `experiences.open_time` and `close_time` are `HH:MM` text.
- `price_amount` and `total_amount` are whole LKR. `rating` is tenths.
- `experiences.ideal_for_tags` is `text[]` (friends, couples, families, teams, solo).
- Categories in use: `sports`, `adventure`, `arts`, `wellness`, `recreation`.
- Schema changes go through `drizzle-kit push`. There are no migration files and no history.

### Seed and the rolling slot window

`seedDatabase()` runs only when `ENABLE_SEED=true`. On an already-seeded database it still
runs `standardizeCurrencyToLKR()` and `applyDemoUpgrades()`. These backfill ratings, add
Recreation experiences, top up 30 days of slots per experience, and backfill `image_url`.
Search filters for "tonight", "weekend", and dates depend on that top-up. Without
`ENABLE_SEED=true`, slots go stale and those filters return nothing.

### Images

Experience photos are static files at `/images/<name>.png` in `client/public/images/`.
Each experience's `image_url` points at one of them, and the UI renders
`imageUrl || "/images/fallback.png"`. The files available on 2026-10-08: arcade, billiards,
cooking, darts, fallback, golf, hero-bg, pottery, rafting, recreation, spa, surfing,
volleyball, yoga. There is no upload pipeline: vendors cannot add photos.

## Integrations

None. No payments, email, SMS, maps, storage, or analytics. Booking is request-only, and
the vendor confirms or declines it.

## Cross-cutting concerns

- Errors: handlers `try/catch` and return `500 { message: error.message }`. A global handler
  in `index.ts` does the same for anything uncaught.
- Logging: `console.log` plus a logger that prints every `/api` response body.
- No rate limiting, CORS config, helmet, or `trust proxy`.
- Time: the server uses UTC, the client uses the browser's local time, and the market is
  UTC+05:30.

## Known debt and sharp edges

Confirmed by reading the code on 2026-10-08. Ordered by risk.

1. **Cross-vendor writes.** `DELETE /api/vendor/slots/:id` deletes any slot, and
   `PATCH /api/vendor/bookings/:id` updates any booking. Any vendor can do either,
   because there is no ownership check on the target.
2. **Mass assignment.** Vendor and admin handlers pass `req.body` straight to storage:
   - `PATCH /api/vendor/profile` lets a vendor set its own `verificationStatus` or `ownerProfileId`.
   - `POST` and `PATCH /api/vendor/experiences` let a vendor set `rating`, `reviewCount`,
     `vendorId`, or `offerLabel`.
   - `POST /api/bookings` spreads the body before overriding the known fields.
3. **No input validation.** The zod `insert*Schema` exports are unused by routes.
4. **Session secret fallback.** Without `SESSION_SECRET`, sessions are signed with a string
   committed to the repo. Cookies are also `secure: false`, with no `trust proxy`.
5. **Personal data in logs.** The `/api` logger prints full response bodies: users' emails
   and phone numbers, and customer names and emails on vendor and admin booking lists.
6. **Overbooking.** A booking checks `slot.capacity > 0` but neither compares it to `qty`
   nor decrements it. Slots never fill from real bookings.
7. **Timezone.** Search "now" and "tonight", the "past slot" check in bookings, and
   seed slot dates all use UTC. The "Open Now" badge uses the browser's zone. For Sri Lanka
   users, the server is 5.5 hours behind.
8. **Unpublished data is public.** `GET /api/experiences/:id` and `/:id/slots` return
   drafts.
9. **Vendor verification does not gate anything.** An unverified vendor can publish
   listings, and they appear in search.
10. **N+1 queries.** Booking and favorite lists query once per row.
    `getBookingsByVendor` loads every booking in the database and filters in JavaScript.
11. **drizzle-kit push and the `session` table.** The table is not in `shared/schema.ts`,
    so push may offer to drop it. UNVERIFIED. Read the prompt and answer no.
12. **Binds to `127.0.0.1`.** Must change before hosting anywhere but Replit.
13. **No tests, lint, or migrations history.**

## Decisions

No ADRs written yet. Proposed retrospective ADRs, to be confirmed by the owner:

1. Session cookies in Postgres, not JWT. Simple, revocable, and one process.
2. One Express process serves the API and SPA. Simplest Replit hosting.
3. Neon DEV/PROD split, chosen by `NODE_ENV` or `REPLIT_DEPLOYMENT`, with `drizzle-kit push`
   instead of migration files.
4. Whole-unit LKR prices, and ratings as integer tenths.
5. Demo seed and upgrades at boot, gated by `ENABLE_SEED`, including the rolling 30-day slot window.
