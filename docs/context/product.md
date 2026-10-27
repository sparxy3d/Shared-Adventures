# Product context

Last verified: 2026-10-27 (kit refresh by Claude from specs 007 to 013 and decisions made on
2026-10-27. Sudeshi to confirm against the client's requirements; mark changes in a PR.)

Keep this to one page. It answers "what are we building and for whom", so an agent can
judge whether a change makes sense. It is not a roadmap or a backlog.

## What it is

Free Spirit is a marketplace for booking activities and experiences in Sri Lanka: surfing,
rafting, pottery, cooking classes, yoga, spa, sports, recreation and more. It helps people
decide "what should we do right now?" with friends, a partner, family, a team, or alone.

The home page is a decision engine: pick a location, a group size (1, 2, 3–5, or 6+), and
a time (now, tonight, weekend or a date), and get ideas or a random "Surprise Us" pick.

## Who uses it

| Role | What they do |
|---|---|
| Customer (member) | Browse, request a booking for a session, save favorites, join a waiting list ("Notify me"), say whether they are a Sri Lankan resident |
| Vendor | Apply with their activities and an ID document, then manage listings, photos, sessions, booking requests, and a "Taking bookings" switch |
| Admin (Free Spirit staff) | Review applications and documents, approve vendors with a fee plan, edit listings on a vendor's behalf, manage members, pricing and site settings |

## Business rules that are easy to get wrong

- Prices are whole rupees: LKR 2,500 is stored as `2500`. Residents pay the LKR price.
  A listing may also have a whole-USD visitor price, converted at the admin-set USD/LKR rate.
- The booking total, commission and vendor net are computed on the server and stored on the
  booking when it is requested. Later price or commission changes never alter existing bookings.
- Commission: 10% for an introductory period (3 months from the vendor's first published
  listing), then 15%. Admin-editable globally and per vendor.
- A booking needs bookings to be open site-wide, the vendor to be taking bookings, and the
  session to be open, in the future, and to have enough spots. Spots are taken immediately.
- Vendor identity documents are private: only admins can open them.
- Demo content (the seeded vendors and listings) is hidden from the public unless an admin
  turns on "Show demo content".
- "Tonight", "weekend", and "now" are Sri Lanka time.

## Decided, not built yet

- Online payments through PayHere. Free Spirit collects all payments: the card is held when
  the customer requests and charged when the vendor accepts. Vendors are paid after the
  session, minus commission. PayHere holds are credit-card only (Visa and Mastercard) and
  expire after 7 days, so vendors must respond well within that.
- Email or SMS notifications for booking requests.

## Non-goals (for now)

- Customer-written reviews. A `reviews` table exists, but ratings are hidden publicly.
- Settlement in any currency other than LKR. USD is for display and conversion only.
- Native mobile apps.

## Domain glossary

| Term | Meaning | Code name |
|---|---|---|
| Experience, listing, activity | A bookable activity listed by a vendor | `experiences` |
| Vendor | A business that runs experiences, owned by one user account | `vendors` |
| Application | A vendor's request to join, with activities and documents | `vendors` with status `pending` |
| Session, slot | A dated time window for an experience, with capacity | `availability_slots` |
| Booking request | A customer's request for a session. It starts as `requested` | `bookings` |
| Fee plan | A vendor's introductory rate, months and standard rate | `vendors.commission_*` |
| Taking bookings | A vendor's own on/off switch | `vendors.taking_bookings` |
| Demo content | Seeded vendors and listings used for sales demos | `is_demo` |
| Waiting list | Emails to notify when a listing opens | `waiting_list` |

## Demo accounts (seeded, also in production by decision)

`admin@freespirit.com` / `admin123`, `vendor1@freespirit.com` / `vendor123`,
`vendor2@freespirit.com` / `vendor123`, `user@freespirit.com` / `customer123`. Kept for sales
demos. These are public credentials: the demo admin can see private vendor documents, so its
password must change before real vendors apply in volume.

## Quality bar

- Mobile-first and fast on a phone. Most discovery happens on a phone.
- A booking request must never be lost or mispriced.
- A vendor must never see or change another vendor's data.
- No em dashes in user-facing text.
