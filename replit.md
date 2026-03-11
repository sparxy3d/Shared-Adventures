# Free Spirit - Activity Booking Platform

## Overview
A multi-vendor activity and experience booking marketplace that helps people connect through shared activities. Users can discover and book sports, adventures, arts & classes, and wellness experiences to enjoy with friends, family, teams, or someone special.

## Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui + wouter (routing) + TanStack Query + Framer Motion
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Session-based with scrypt password hashing

## Architecture
- `client/src/pages/` - Page components organized by section (vendor/, admin/)
- `client/src/components/` - Shared components (navbar, footer, experience-card)
- `server/routes.ts` - All API endpoints
- `server/storage.ts` - Database storage layer (DatabaseStorage class)
- `server/db.ts` - Drizzle database connection
- `server/seed.ts` - Seed data for demo
- `shared/schema.ts` - Drizzle schema definitions and Zod types

## Database Tables
- users, countries, vendors, experiences, experience_images, availability_slots, bookings, favorites, reviews

## User Roles
- **customer** (default) - Browse, book, favorite
- **vendor** - List activities, manage bookings
- **admin** - Manage vendors, experiences, countries, analytics

## Test Accounts (seeded)
- Admin: admin@freespirit.com / admin123
- Vendor: vendor1@freespirit.com / vendor123
- Customer: user@freespirit.com / customer123

## Homepage Design
- Premium cinematic hero with full-width background image (`/images/hero-bg.png`) and dark gradient overlay
- Headline: "Adventure Starts Here" with amber gradient text
- Large search bar in hero area, "Explore Adventures" + "Surprise Us" CTAs
- Scroll indicator: "What should we do right now?" bouncing arrow
- Promo banner above navbar: "Launch Offer — Free listings for early vendors"
- Navbar: sticky positioning with transparent variant on homepage, search bar, cart icon, category sub-nav
- **Decision Engine** section: location input, group size chips (1/2/3-5/6+), time mode (Now/Tonight/Weekend), "Show Ideas" + "Surprise Us" buttons
- Category shortcut cards with background images
- **Open Near You** section (live-filtered from featured by open status)
- Popular Right Now grid, How it works steps, bottom CTA
- **Surprise Us** modal dialog: loading animation → random experience card → "View Details" / "Try Another"

## Experience Cards
- "Open Now" / next-session badges via `getOpenStatus()` (exported from experience-card.tsx)
- Ideal-for tags with emoji icons: friends 👫, couples 💑, families 👨‍👩‍👧, teams 🏢, solo 🧘
- Duration overlay, hover lift animation (framer-motion), premium rounded-2xl design
- Category color badges, heart favorite button

## Search Page
- Discovery-first: dynamic headline changes based on filters ("Things you can do right now", "Weekend adventures", etc.)
- Category chips, city input, collapsible advanced filters (time mode, group size)
- Animated results grid with staggered entrance

## Experience Detail
- Hero image with Open Now/Closed badge, favorite + share buttons
- "Perfect for" section with emoji ideal-for tags
- "Share with Friends" copy-to-clipboard button
- Gradient booking CTA ("Request Booking"), sticky sidebar on desktop
- Duration/capacity badges, safety notes callout

## Key Pages
- `/` - Home (hero, decision engine, categories, open near you, popular, how it works)
- `/search` - Discovery-first browse with filters
- `/experience/:id` - Experience detail + booking
- `/login`, `/signup` - Authentication
- `/account`, `/bookings`, `/favorites` - Customer portal
- `/vendor`, `/vendor/profile`, `/vendor/experiences`, `/vendor/bookings` - Vendor portal
- `/admin` - Admin panel (tabs: vendors, experiences, bookings, countries)

## Color Theme
- Primary: Warm amber/orange (hsl 22 93% 53%)
- Font: Plus Jakarta Sans

## MVP Booking Flow
1. Customer browses experiences
2. Selects group size and optional time slot
3. Submits "Request to Book"
4. Vendor confirms or declines
5. Booking status: requested → confirmed → completed
