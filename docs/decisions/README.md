# Decisions

Architecture Decision Records. One file per decision, numbered in order, never renumbered.

## Rules

- Write an ADR when a choice is expensive to reverse, or when a reasonable engineer would ask
  "why is it like this". Every Risky (tier 2) change records its real decisions here.
- ADRs are append-only. To change a decision, write a new ADR and mark the old one
  `superseded by <NNN>` (or partly superseded, saying which part).
- Copy `0000-template.md`. Keep each ADR to one page.
- Numbering: 0001 to 0006 use four digits. From 007 on, the number matches the spec that made
  the decision, with three digits. Use the next free number; there is no 008.
- Add every new ADR to the index below in the same change.

## Index

| No. | Decision | Status |
|---|---|---|
| 0001 | Member prototype boundaries: home city in browser storage, support email for deletion and resets | accepted |
| 0002 | Session-backed discovery | accepted |
| 0003 | Booking choice and contact boundary | accepted |
| 0004 | Vendor application placeholders; contacts disclosed only on confirmed bookings | accepted; application details partly moved to a JSON column by 011 |
| 0005 | Device pattern and session safety | accepted |
| 0006 | Approval date recorded in the vendor description (no schema change) | accepted, known debt |
| 007 | Private verification documents in Postgres; vendor "Taking bookings" switch | accepted; owner-applied SQL superseded by 013 |
| 009 | Booking financial snapshots and explicit dual pricing | accepted |
| 010 | Onboarding controls (temporary passwords, demo visibility, bookings open) and public photos in App Storage | accepted; owner-applied SQL superseded by 013 |
| 011 | Structured application activities in a JSON column; drafts created on approval | accepted |
| 012 | Vendor fee plans; introductory rate before first publication | accepted |
| 013 | Tracked start-up migrations; no hand-applied production SQL | accepted |
| 014 | Production on the Neon `production` branch; Replit database retired | accepted |
| 015 | One intake process for every request, with category-based approval | accepted |
