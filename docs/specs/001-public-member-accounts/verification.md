# Stage 1 delivery and verification

Date: 2026-10-08. Specification approved by the owner before implementation.
No publish, schema migration, package installation, environment changes or
production verification was performed.

## Checks performed

| Check | Method and result |
|---|---|
| TypeScript | `npm run check` passed. |
| Production build | `npm run build` passed; this builds files, it does not publish. |
| Patch formatting | `git diff --check` passed. |
| Test harness syntax | `node --check script/verify-stage-one.cjs` passed. |
| Signup | Installed Chromium, development browser/API: consent required, full name saved, +94 mobile saved, customer session returned without password. |
| Member return path | Login with `?next=/account/saved` reached that page. Logged-out `/account/bookings` redirected to login preserving the destination. |
| Password change | Real development API/UI: unauthenticated call rejected, short password rejected, unexpected userId rejected, wrong current password shown inline, repeated-password mismatch shown inline, successful change clears password inputs. Old password rejected with the specified generic error; new password accepted. Demo passwords were not changed. |
| Profile | Real profile endpoint successfully saves name/mobile. Email is read-only. Catalog home city saves in per-user localStorage, survives reload and is marked “Saved on this device”. |
| Roles | Each supplied demo account logged in: admin → `/admin`, vendor → `/vendor`, customer → `/`. Public avatar menus contain the specified account links plus the appropriate admin/vendor link. Vendor/admin opening member pages sees the member-only message and a home link. |
| Legacy routes | `/bookings` → `/account/bookings`, `/favorites` → `/account/saved`, `/account` → `/account/profile`. |
| Responsive layouts | Real Chromium at 320, 390 and 1280px: login, signup and all three account screens had no horizontal overflow. Captured screenshots; inspected the signed-in phone profile and public login/contact screens. Logged-out phone drawer contains all five categories and auth/vendor links. |
| Bookings | Browser-only intercepted fixtures verified all five status badges, human date/time, whole `LKR 2,500`, upcoming/past separation, detail dialog, vendor note, contact guidance and clipboard sharing. No booking fixtures were inserted into any database. |
| Saved items | Real API add of an existing published experience to a disposable member, then heart removal through UI; GET favorites confirms the saved item was removed. |
| Errors and pending states | Real wrong-password errors; intercepted 429 shows the exact required text. Intercepted booking 500 displays a plain error; Retry recovers to the empty state. Real loading skeletons observed before account queries settle. |
| Deletion prototype/logout | Opened and cancelled deletion confirmation, without sending email. Profile Log out cleared the session and restored guest navigation; GET me returns 401. |
| Public support/legal | About, Contact, Help, forgot-password and all draft legal routes load. Support comes from the catalog. Social buttons are disabled/Coming soon; password eye toggles visibility. |
| Small unit assertions | `tsx` assertions verify same-origin safe return URLs, rejection of external/auth-loop/control-character paths, Sri Lanka midnight conversion and human date formatting. |

Browser checks used the installed Chromium and existing `ws` dependency because
the bundled testing service was unsupported. Assertions were verified in split
runs while correcting browser-harness setup, pointer dispatch and asynchronous
waiting. The member journey passed through password replacement and legacy/gate
checks; role/auth/legal checks passed using `--roles-only`; the final populated
content/error checks passed using `--content-only`. This is not a claim that a
single fresh end-to-end run of the final combined command was completed.

The retained runner supports the complete journey by default, or the two focused
flags above. It creates disposable development members. Test-created accounts
remain in development; test favorites were removed, and no vendor/experience
records were edited by the browser checks.

## Scope safety checks

`git diff --exit-code` confirmed these protected areas unchanged:

- `server/seed.ts`, `server/index.ts`, `server/db.ts`, `server/storage.ts`
- `shared/schema.ts`, `shared/catalog.ts`
- vendor/admin pages and the home/search/experience-detail pages

The only server diff is the authenticated password endpoint in `server/routes.ts`.
Existing guards, password hashing and storage update functions are reused.

The development startup emitted `Database already seeded, skipping...`, which
means the existing enabled seeding path ran. Its flag, boot code and follow-up
logic were not changed. No further production conclusion is inferred from this.

## Assumptions and limits

- Server role `customer` is called “member” in the UI. The three member account
  screens remain customer-role-only through the existing role gate.
- A booking timeline is inferred from current status, not an invented event log;
  no event-history schema or fictional timestamps were added.
- Nonempty booking/status rendering and 429/server failures used browser
  fixtures. Real booking submission, vendor transitions and historical vendor
  notes were not exercised as database workflows.
- Clipboard fallback was verified, not a physical phone's native share sheet.
- CSS/markup implement focus, contrast, minimum sizes, alt text and reduced
  motion. This was not a complete assistive-technology or WCAG audit.
- Forgot-password and account deletion deliberately remain support-email
  prototypes. Social sign-in is deliberately disabled. Legal pages remain drafts.
- Password change does not revoke other devices' sessions; that was not requested.
- Existing build warnings remain: stale Browserslist data, PostCSS `from` option,
  and a large frontend bundle. No unrelated tooling changes were made.

## Every changed file

### Application

1. `client/src/App.tsx` — account redirects and new legal/support routes.
2. `client/src/components/auth-layout.tsx` — shared auth card/photo.
3. `client/src/components/experience-card.tsx` — optional member saved/remove display, truthful member metadata and reduced motion.
4. `client/src/components/footer.tsx` — catalog/navigation/support links.
5. `client/src/components/member-layout.tsx` — gated member shell and shared loading/error UI.
6. `client/src/components/navbar.tsx` — public desktop/mobile and role-aware menus.
7. `client/src/components/require-role.tsx` — skeleton, auth retry, return path, wrong-role message/home.
8. `client/src/components/stage-one.css` — scoped requested visual/accessibility rules.
9. `client/src/hooks/use-auth.ts` — exposes existing query error/retry, no second identity query.
10. `client/src/lib/auth-navigation.ts` — safe local return URLs.
11. `client/src/lib/member-dates.ts` — Sri Lanka booking instants and human labels.
12. `client/src/pages/account.tsx` — member profile/password/local city/logout/deletion.
13. `client/src/pages/favorites.tsx` — member bucket list and heart removal.
14. `client/src/pages/legal.tsx` — draft legal/About layouts.
15. `client/src/pages/login.tsx` — login/error/role-return flow.
16. `client/src/pages/my-bookings.tsx` — member bookings/tabs/details/share.
17. `client/src/pages/signup.tsx` — member signup/consent/mobile flow.
18. `client/src/pages/support.tsx` — Contact/Help/forgot-password.
19. `server/routes.ts` — only the new password-change endpoint.

### Verification and approved documentation

20. `script/verify-stage-one.cjs` — development browser verification.
21. `docs/decisions/0001-member-prototype-boundaries.md` — accepted prototype boundaries.
22. `docs/specs/001-public-member-accounts/spec.md` — approved specification.
23. `docs/specs/001-public-member-accounts/design.md` — implementation approach/contracts.
24. `docs/specs/001-public-member-accounts/tasks.md` — completion checklist.
25. `docs/specs/001-public-member-accounts/verification.md` — this report.

### Agent memory (no application behavior)

26. `.agents/memory/MEMORY.md` — index of durable lessons.
27. `.agents/memory/seed-idempotency.md` — removes the stale assumption that every restart runs seeding.
28. `.agents/memory/verification-tooling.md` — unsupported testing-service guidance.
