# Verification: Vendor Terms v1.0, all three parts

## Summary for Sudeshi
All ten supplied sections are present, without a vendor draft notice.
Desktop has a generated contents list and a 720px reading column. Phones use
16px side gutters. The application checkbox reads "I agree to the vendor terms"
and opens the terms in a new tab. New applications record version 1.0 with their
acceptance timestamp. Historical acceptance records retain their original version
and timestamp. Admin vendor profiles show acceptance date and time in Sri Lanka time.
Terms of Service (/terms) and Privacy (/privacy) still present themselves as drafts;
they were deliberately left unchanged.

## Final part 3 verification
- PASS: `npm run check` and `npm run build`.
- PASS: sections 1 to 6 remain byte-for-byte identical to the committed content
  before part 3. The document has ten ## headings and contains no em dashes.
- PASS: `NODE_ENV=development npx tsx script/test-multi-activity-applications.ts --screenshots`
  using disposable development schemas and real guarded HTTP endpoints. New
  applications store `Vendor terms (1.0) accepted: <ISO timestamp>`. A historical
  0.9 acceptance line remains exactly unchanged through approval and subsequent
  application submissions. Existing application validation and draft-creation tests pass.
- PASS: `node script/capture-vendor-terms.cjs <isolated fixture URL>` at 1440px and
  375px: ten headings, ordered list, fee table, responsive contents, no horizontal
  overflow, exact checkbox text, link actually opens the full terms in a new tab,
  checkbox toggles and admin vendor pages show original 0.9/new 1.0 acceptance with time.
- PASS: zero browser page errors; screenshots inspected.
- PASS: isolated server stopped cleanly with exit 0 and its finally cleanup dropped
  the fixture schema. No persistent application/vendor test records were created.
- PASS: `git diff --check`.

Initial integration runs exposed two fixture issues: the old fixture omitted the
now migration-managed session table; and a preservation assertion incorrectly
required the entire application description to stay unchanged, although approval
legitimately appends separate audit metadata. The fixture now owns its own session
table and compares the immutable acceptance line. The initial browser test selected
two identical business names ambiguously; fixture selection now uses distinct
test email identities. No production behavior was changed to accommodate tests.

### Part 3 changed files
- `client/src/content/vendor-terms.md`
- `client/src/components/vendor-application-form.tsx`
- `client/src/lib/vendor-listings.ts`
- `client/src/pages/admin/vendor-detail.tsx`
- `shared/catalog.ts`
- `script/test-multi-activity-applications.ts`
- `script/capture-vendor-terms.cjs`
- `docs/specs/014-vendor-terms/spec.md`
- `docs/specs/014-vendor-terms/verification.md`
- `.agents/memory/neon-test-isolation.md`

### Final screenshots
Under ignored `generated-artifacts/vendor-terms-final/`:
`top-1440.jpg`, `top-375.jpg`, `section-5-1440.jpg`, `section-5-375.jpg`,
`checkbox-1440.jpg`, `checkbox-375.jpg`.

### Migration and production
No schema change or new migration is needed. Existing application-description
storage already records version and timestamp on submission; only the shared
current-version constant changes. No backfill or production database access.
Migration 013 already exists and was not touched. No seed or ENABLE_SEED changes.
No secrets or configuration changes. Nothing was published.

The supplied legal copy describes payments, weekly payouts, automatic response
deadlines and document/back-up retention commitments. This task publishes none
of those operational capabilities and does not verify those claims. Confirm them
separately before publishing these terms. Historical 0.9 acceptance display is
intentionally retained, not relabelled as 1.0.

## Part 1 historical verification
- PASS: `npm run check`.
- PASS: `npm run build`. Existing Browserslist, PostCSS and bundle-size warnings remain.
- PASS: browser assertions at 1440px, 375px and 320px: three section headings,
  three bullet lists, bold lead-ins, no draft language and no horizontal overflow.
- PASS: desktop contents links navigate to the matching section; contents hidden on phones.
- PASS: an in-memory fixture appended a heading, ordered list and table. React
  rendering produced an automatic contents link, an ol, a table and bold table content.
  This fixture did not change the content file.
- PASS: visual screenshots inspected at 1440px and 375px.
- PASS: `git diff --check`.

The first browser attempt through the development proxy did not reach the page.
The final browser checks used the same direct preview port as the screenshot tool.
A test-selector error for a numeric heading ID was corrected by using an attribute
selector; the actual jump link worked.

## Part 1 verification boundary
The managed application workflow was already failed. To avoid backend startup,
migrations, seeding or database activity, screenshots and browser checks used
`vite preview` serving the built static front end temporarily on port 5000.
The desktop screenshot consequently shows the existing header's Account unavailable
state. No login or database behavior was tested or changed. The temporary preview
was stopped after verification. An automatic port configuration change was restored
to its original contents, leaving no configuration diff.

## Part 1 files changed
- `client/src/content/vendor-terms.md`
- `client/src/components/vendor-terms.tsx`
- `client/src/components/vendor-terms.css`
- `client/src/pages/legal.tsx`
- `docs/specs/014-vendor-terms/spec.md`
- `docs/specs/014-vendor-terms/verification.md`

Screenshots (ignored generated outputs):
- `generated-artifacts/vendor-terms/top-1440.jpg`
- `generated-artifacts/vendor-terms/top-375.jpg`

## Readiness
No migration, environment setting, dependency or backend endpoint change.
All requested code/content changes are complete. No publishing performed.

**Ready to publish: No**
The owner must confirm the operational promises described above before publishing
the final legal terms. Code/content verification for the requested scope passes.
