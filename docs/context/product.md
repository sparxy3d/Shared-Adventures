# Product context

Last verified: 2026-10-08 (/onboard run by Claude; owner review pending)

> DRAFT. Reconstructed from `replit.md`, the previous `CLAUDE.md`, UI copy, routes, and seed
> data. Product intent cannot be read from code. The owner must confirm "Non-goals" and
> "Business rules" before specs rely on them.

Keep this to one page. It answers "what are we building and for whom", so an agent can
judge whether a change makes sense. It is not a roadmap or a backlog.

## What it is

Free Spirit is a marketplace for booking activities and experiences. Examples are surfing,
rafting, pottery, cooking classes, yoga, spa, volleyball, golf, darts, billiards, and
arcades. It helps people decide "what should we do right now?" with friends, a partner,
family, a team, or alone. The launch market is Sri Lanka, and prices are in LKR.

The home page is a decision engine: pick a location, a group size (1, 2, 3–5, or 6+), and
a time (now, tonight, or weekend), and get ideas or a random "Surprise Us" pick.

## Who uses it

| Role | What they do |
|---|---|
| Customer | Browse and search, view an experience, request a booking for a session, save favorites, see their bookings |
| Vendor | Create a vendor profile, list experiences, set availability slots, confirm or decline booking requests |
| Admin | Verify vendors, edit or publish listings on a vendor's behalf (vendors are onboarded manually), view bookings and stats, add countries |

## Core capabilities

- Discovery: categories, city, text search, time mode, group size, a date with open sessions,
  "Open near you", popular items, and offers.
- Experience detail: photos, "Perfect for" tags, duration and capacity, safety notes,
  sessions grouped by day, and sharing.
- Request to book: the customer picks a session and quantity, and the server prices it.
  The vendor confirms or declines. There is no online payment.
- Vendor portal: profile, listings, availability, and bookings.
- Admin panel: vendors, experiences, bookings, and countries.

## Non-goals (draft, confirm)

- Online payments, payouts, and commissions.
- Vendor photo uploads. Images are a fixed curated set.
- Reviews written by customers. A `reviews` table exists, but ratings are seeded.
- Multiple currencies at launch. Australia is seeded, but listings are standardized to LKR.
- Native mobile apps.

## Domain glossary

| Term | Meaning | Code name |
|---|---|---|
| Experience | A bookable activity listed by a vendor | `experiences` |
| Vendor | A business that runs experiences, owned by one user account | `vendors` |
| Slot / session | A dated time window for an experience, with capacity | `availability_slots` |
| Booking request | A customer's request for a slot. It starts as `requested` | `bookings` |
| Ideal for | Who an experience suits: friends, couples, families, teams, solo | `ideal_for_tags` |
| Open now | Current time is between an experience's `open_time` and `close_time` | `getOpenStatus()` |
| Offer | A promotional label on an experience | `offer_label` |
| Published | Visible to customers. `draft` is hidden from listings | `experiences.status` |
| Verified vendor | An admin approved the vendor | `verification_status = approved` |

## Business rules that are easy to get wrong

- Prices are whole rupees. LKR 2,500 is stored as `2500`.
- The booking total is `price_amount × qty`, computed on the server. The client's figure is ignored.
- A booking for a slot needs the slot to be `open`, not in the past, and to have capacity.
  Capacity is not reduced by bookings today (see `architecture.md`).
- Ratings display as one decimal from integer tenths.
- Demo schedules are realistic. Pottery and cooking run on weekdays only, and volleyball
  on weekends only. About 10% of slots are full, and about 10% are almost full.
- "Tonight", "weekend", and "now" are meant in Sri Lanka time.

## Test accounts (seeded, dev only)

`admin@freespirit.com` / `admin123`, `vendor1@freespirit.com` / `vendor123`,
`user@freespirit.com` / `customer123`. These are public demo credentials. They must not
exist in a production database that holds real users.

## Quality bar (draft, confirm)

- Mobile-first and fast on a phone. Most discovery happens on a phone.
- A booking request must never be lost or mispriced.
- A vendor must never see or change another vendor's data.
