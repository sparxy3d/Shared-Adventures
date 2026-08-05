# Free Spirit — Context for Claude

Free Spirit is a multi-vendor activities & experiences booking MVP (Sri Lanka market, prices in LKR).
Stack: React (wouter, TanStack Query, framer-motion, shadcn/ui, Tailwind) + Express + Drizzle ORM/PostgreSQL.

## What to read (product & logic)

| Area | Files |
|---|---|
| Data model | `shared/schema.ts` (single source of truth for all tables) |
| API routes | `server/routes.ts` |
| Data access & filtering | `server/storage.ts` (`getPublishedExperiences` implements time/group/date/city filters) |
| Demo seed & idempotent upgrades | `server/seed.ts` (runs on **every** boot — all steps must be re-run safe) |
| Key pages | `client/src/pages/home.tsx` (Decision Engine), `search.tsx`, `experience-detail.tsx` |
| Shared helpers | `client/src/lib/currency.ts` (formatPrice — whole rupees, NOT minor units), `client/src/lib/dates.ts` |

## What to SKIP (do not read — noise, not product logic)

- `client/src/components/ui/**` — stock shadcn/ui boilerplate, unmodified generated components
- `client/public/images/**`, `*.png` — binary image assets (~26 MB)
- `package-lock.json` — generated lockfile
- `dist/`, `attached_assets/`, `.agents/`, `.local/`, `.cache/`, `.config/` — build output, prompt dumps, agent memory, tooling state
- `.env` — secrets, never read or suggest committing

## Domain notes

- Ratings are stored as tenths in an int column (`rating: 46` = 4.6 stars).
- `priceAmount` is whole LKR rupees; never divide by 100.
- `availability_slots.date` is a `YYYY-MM-DD` text column; seed keeps a rolling 30-day window per experience with realistic schedules (pottery/cooking weekdays only, volleyball weekends only) and deterministic hash-based availability variation (~10% full, ~10% almost full).
- Bookings are validated server-side (price recomputed, slot must be open/future with capacity).
- Test accounts: admin@freespirit.com/admin123, vendor1@freespirit.com/vendor123, user@freespirit.com/customer123.
