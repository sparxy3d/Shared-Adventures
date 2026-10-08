# Stage 2 — Homepage and shared activity card

Status: approved
Approval: the owner's Stage 2 implementation prompt is the specification.
Tier: 2 (homepage, shared discovery cards and activity routing).

## Scope and acceptance

Implement the owner's screen-1 specification without server changes:

- One shared 3:2 activity card everywhere: real Sri Lanka next-session chip
  (within hour / tonight / today / weekday), category, two-line title,
  city/duration, whole-LKR price, View, functional save/remove heart.
  No ratings, review counts, offers or opening-hours badge.
- Canonical `/activity/:id` reuses detail page; old experience path redirects.
- Keep Stage 1 header/footer. Homepage order: specified photo hero/copy,
  overlapping discovery card, in-place submitted ideas, filtered surprise,
  five catalog category tiles, up to four real now-session cards, unique
  soonest-first featured cards (up to eight), three explanatory steps, photo CTA.
- Default group 2 and Now; saved-device home city prefills. Catalog city
  suggestions/clear and permission-on-tap geolocation with nearest-city
  mapping entirely in browser; refusal text and city-field focus.
- Live server search count on the button. Search is submitted on first tap;
  headings have accurate count/group/time/date/city grammar. Empty state can
  rerun Weekend/Any city and shows up to three same-group/city next cards.
- Surprise uses identical filters, excludes current ID on retry, has a 600ms
  reveal (none with reduced motion), 404 empty message/Weekend action.
- At 390/1280px verify defaults, each time/date/group/city, empty and nonempty
  surprise, location refusal, session chips and no fabricated social proof.
  No sideways scroll at 320px. Mobile hero <=55vh and discovery begins above fold.
- Same Stage 1 typography/colors/accessibility/loading/error rules; selected
  filter pills use the specifically requested orange fill and white text.

## Guardrails

No changes to server, schema, seeds, startup writes, ENABLE_SEED, DB_TARGET,
guards, package dependencies, Stage 1 header/footer or unrelated pages.
No publish, database push, fake numbers, discounts or testimonials.
Use shared categories/cities and existing whole-unit price helper.
Coordinates never stored or transmitted. Existing images only.
Report every changed file, tests and limitations.
