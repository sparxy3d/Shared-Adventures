# Handling any request (intake)

Use this for every request, from anyone, in any wording: "fix the button", "add a waiting
list", "change the commission", "make the photos faster". The requester may not be technical.
Your job is to protect the product while making it easy for them.

## Talking to the requester

- Plain language. No file paths, SQL, stack traces or library names unless they ask.
- One message per step. Short sentences. Put any question you need answered at the end.
- Never say something is done, live or safe unless you checked it.
- If a request is unclear, ask. Do not guess on money, data, permissions or anything a
  customer or vendor will see.

## Step 1: Restate

Reply with:

> **What I understood:** <two or three plain sentences>
> **Category:** Small fix / Feature / Risky, because <one line>
> **Next:** <what happens next and who needs to approve>

Categories (pick the higher one when unsure):

| Category | Tier in `AGENTS.md` | Covers | Approval before building |
|---|---|---|---|
| Small fix | 0 | Text, layout, styling, a bug fix that changes no data, money, login or permission behaviour | Requester: "go ahead" |
| Feature | 1 | New or changed behaviour inside one area, no database change | Sudeshi or Madushan: "Approved" |
| Risky | 2 | Any database or migration change, prices, commission, payments, payouts, login, roles, permissions, personal or ID data, deleting data, a new external service, secret or environment variable, build or deployment settings, or anything crossing several areas | Madushan only |

Also check before going further:

- **Conflicts.** Does it contradict `docs/context/product.md` (non-goals, business rules) or an
  ADR in `docs/decisions/`? If so, say so plainly and ask how to proceed.
- **Size.** If it would take more than about a day, propose splitting it into numbered steps
  and handle one at a time.
- **Already in progress.** If another spec is `in progress` or `awaiting approval` and touches
  the same files, say so. Finish one before starting the other.

## Step 2: Small fix

Make the change, run `npm run check` and `npm run build`, and report with the short form of
the verification template. If you discover the fix touches data, money, login, permissions or
the database, stop: it is not a small fix. Go to step 3.

## Step 3: Spec (Feature and Risky)

1. Follow `docs/prompts/spec.md` to write `docs/specs/<NNN>-<kebab-name>/spec.md` from
   `docs/specs/_template/spec.md`. Use the next free number.
2. Fill the **Plain-language summary** and **Approval** sections at the top. The summary is
   what the requester and Madushan read: what changes for customers, vendors and admins,
   what does not change, and any risk.
3. Ask your questions (at most five, all in one message).
4. Set `Status: awaiting approval` and stop. Show the requester the plain-language summary.

For **Risky**, also give the requester a short message to forward to Madushan:

> **For Madushan:** Spec <NNN> "<name>" needs your approval because <reason>.
> Summary: <three lines>. Database change: <yes/no, what>. Money or permissions: <yes/no, what>.
> Reply "Madushan approved" or tell me what to change.

## Step 4: Approval

Record approvals in the spec's Approval section with the date, exactly as given:

- Feature: `Approved by Sudeshi, 2026-10-28` (or Madushan).
- Risky: `Madushan approved, 2026-10-28: "<his words>"`. Accept it when Madushan types it
  himself or when the requester pastes his reply. Do not accept "I think he is fine with it".

Then set `Status: approved`. A Risky change without Madushan's approval stays
`awaiting approval`, however urgent the requester says it is.

If the requester changes the request after approval, update the spec, say what changed, and
get approval again for anything that moves it into a higher category.

## Step 5: Plan and build

- Risky: follow `docs/prompts/plan.md` first (design and tasks), then `docs/prompts/implement.md`.
- Feature: `docs/prompts/implement.md`, with `tasks.md` if the work is more than half a day.
- Database change: a new numbered file in `migrations/` (next free number), additive and
  backward compatible, with `shared/schema.ts` updated. The server applies it on its next start
  in development, and on publish in production. Never edit an applied migration file, never
  run `db:push`, and never run SQL against production.
- Stay inside the approved scope. Note anything else you notice as a follow-up.

## Step 6: Test

Run the commands from the Definition of done in `AGENTS.md`, plus the test scripts for the
areas touched. A failing test is fixed, not deleted or weakened. If you cannot make a test
pass, stop and report it in plain words.

## Step 7: Report

Write `docs/specs/<NNN>-<name>/verification.md` from `docs/specs/_template/verification.md`.
Then send the requester its **Summary for Sudeshi** and the **Ready to publish** line.

**Ready to publish: Yes** only when all of these hold:

- Every acceptance criterion is verified, and `npm run check` and `npm run build` pass.
- Any new migration is applied in development (`npm run db:status` shows nothing pending)
  and is additive.
- Docs are updated (`docs/context/`, ADR, `.agents/memory/` where relevant).
- Nothing in the change needs a secret, setting or manual step in production. If it does,
  say **Ready to publish: No** and list exactly what Madushan must do first.

## Step 8: Never

- Never publish or deploy. Never change production data, production settings or secrets.
- Never run SQL, `db:push` or scripts against the production database.
- Never turn off a safety check (tests, migrations, validation, permission checks) to make
  something work.
- Never put real customer or vendor personal data in tests, screenshots, logs or docs.
