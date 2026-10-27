# Free Spirit

<!-- Owners: Madushan (technical) and Sudeshi (product). Keep this section first and
     unchanged unless a spec changes the process. Replit Agent reads this file every session. -->

## Every request follows the same process (mandatory)

Whoever is asking, and however the request is worded, handle it with
`docs/prompts/request.md`. In short:

1. **Restate** the request in two or three plain sentences. No jargon.
2. **Classify** it as a Small fix, Feature or Risky change (table below), and say why in one line.
3. **Spec**: for a Feature or Risky change, write `docs/specs/<NNN>-<name>/spec.md` from the
   template, starting with a plain-language summary. Ask at most five questions, all at once.
4. **Wait for approval.** Do not change code until the right person has approved (table below).
5. **Build** from the approved spec. Any database change is a new numbered file in `migrations/`.
6. **Test** with the commands in `AGENTS.md`. Fix failures. Never weaken a test to pass.
7. **Report** with `docs/specs/_template/verification.md`, ending with
   **Ready to publish: Yes / No** in plain words.
8. **Never publish**, never change production data or secrets, and never run SQL against
   production. Publishing is a human decision.

| Category | What it covers | Approval needed before building |
|---|---|---|
| Small fix | Text, layout, styling, a bug fix with no change to data, money, logins or permissions | Requester says "go ahead" |
| Feature | New or changed behaviour in one area, no database change | Sudeshi or Madushan: "Approved" |
| Risky | Database or migration, prices, commission, payments or payouts, login, roles or permissions, personal or ID data, deleting data, new external service, secret or environment variable, deployment or build settings | **Madushan only**: "Madushan approved" recorded in the spec |

If you are unsure which category applies, choose the higher one.

## Where everything is

- Rules, commands and definition of done: `AGENTS.md` (read it before any change)
- Product, architecture, tech and conventions: `docs/context/`
- Decisions and why: `docs/decisions/` (index in `README.md`)
- Work in progress: `docs/specs/<NNN>-<name>/`
- Known traps: `.agents/memory/MEMORY.md`
- How Sudeshi works with the agent: `docs/HOW-TO-REQUEST-CHANGES.md`

Where this file and the code disagree, the code wins. Propose a doc fix in the same change.

## Current UI pointers

Kept short on purpose. The code is the reference, so read the page before changing it.

- Routes are in `client/src/App.tsx`. Public: `/`, `/search`, `/activity/:id`, `/for-vendors`,
  `/for-vendors/apply`. Member: `/account/*`. Vendor: `/vendor/*`. Admin: `/admin/*`.
- Brand: warm orange primary, Plus Jakarta Sans. Logos are WebP files in `client/public/brand/`.
- Listing photos are a curated set in `client/public/images/` plus vendor uploads served from
  `/api/listing-images/<id>/<width>.webp` (App Storage, separate DEV and PROD buckets).
- Copy rule: no em dashes in user-facing text.
- Demo listings are hidden in production unless an admin turns on Admin > Settings >
  Show demo content. Booking requests are refused until Admin > Settings > Bookings open.
