# Stage 1: Public shell and member accounts

- Status: approved
- Tier: 2
- Owner: Sudeshi
- Created: 2026-10-08
- Approval: The user approved using the Stage 1 prompt as the specification.

## Outcome and scope

Deliver the public header/footer, login/signup, member bookings, bucket list,
profile and draft legal/support pages in the existing React/Vite/Express app.
Only server addition: an authenticated password-change endpoint. No schema,
seed, boot-write, environment, vendor/admin page or deployment changes.

## Acceptance criteria

- AC1: Header provides Explore, the five catalog categories, For vendors, search,
  and login/signup or a role-aware avatar menu. Mobile drawer contains all links.
  No currency selector or Destinations link.
- AC2: Footer provides five category links, vendor links, About/Contact/Help,
  Privacy and Terms. Contact uses SUPPORT_EMAIL from the catalog.
- AC3: Signup requires name, email, +94 mobile, password of at least eight
  characters, and Terms/Privacy acceptance. Auth cards have an existing lifestyle
  image on desktop, show/hide passwords, disabled coming-soon social buttons,
  forgot-password support, and business/signup links.
- AC4: Login returns customers to a safe local next URL or home; vendors land
  at /vendor and admins at /admin. Invalid credentials use a generic message;
  429 uses “Too many attempts — try again in 15 minutes”.
- AC5: Member bookings use Upcoming/Past in Asia/Colombo, photos, title, vendor,
  human date/time, group size, whole-LKR total and specified status badges.
  Details show a truthful timeline, vendor note, native share/copy and vendor
  contact guidance, not cancellation controls. Empty state links to discovery.
- AC6: Bucket list reuses the activity card and removes saves via its heart,
  with truthful data and the specified empty state.
- AC7: Profile updates name/mobile through the existing endpoint, keeps email
  read-only, saves catalog home city on this device, changes passwords with
  current password and repeated new password, logs out, and confirms prototype
  deletion via a support email.
- AC8: /bookings, /favorites and /account redirect to the new account routes.
  useAuth and RequireRole provide identity/gates without another current-user query.
- AC9: Password endpoint validates with zod, requires the authenticated current
  password, hashes the new password using existing scrypt, and never returns it.
- AC10: /terms, /privacy and /vendor-terms are explicitly marked
  “Draft — final version coming soon”.
- AC11: Scoped screens use the requested max width, typography, colors, radii,
  44px targets, focus, contrast, reduced motion and alt text; no overflow at
  320px. Async screens have skeleton/error-retry/empty/access states.
- AC12: Verify signup, logout, each demo role login/navigation/menu, 390px and
  desktop account layouts, and test-member password replacement.

## Constraints

Sri Lanka only; whole-LKR formatPrice; catalog categories/cities/support; no
invented ratings, counts, discounts or availability. Existing guards and
validations are preserved. Never run db:push, change DB_TARGET or publish.
Mutating verification is development-only; never change demo passwords.
