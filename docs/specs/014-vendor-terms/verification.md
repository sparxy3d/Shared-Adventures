# Verification: Vendor Terms v1.0, part 1

## Summary for Sudeshi
The supplied part 1 replaces the previous vendor terms, without a draft notice.
Desktop has a generated contents list and a 720px reading column. Phones use
16px side gutters. No acceptance checkbox or other page content was changed.
Sections 4 to 10 await the next two messages.

## Results
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

## Verification boundary
The managed application workflow was already failed. To avoid backend startup,
migrations, seeding or database activity, screenshots and browser checks used
`vite preview` serving the built static front end temporarily on port 5000.
The desktop screenshot consequently shows the existing header's Account unavailable
state. No login or database behavior was tested or changed. The temporary preview
was stopped after verification. An automatic port configuration change was restored
to its original contents, leaving no configuration diff.

## Files changed
- `client/src/content/vendor-terms.md`
- `client/src/components/vendor-terms.tsx`
- `client/src/components/vendor-terms.css`
- `client/src/pages/legal.tsx`
- `docs/specs/014-vendor-terms/spec.md`
- `docs/specs/014-vendor-terms/verification.md`

Screenshots (ignored generated outputs):
- `generated-artifacts/vendor-terms/top-1440.jpg`
- `generated-artifacts/vendor-terms/top-375.jpg`

## Production needs and remaining scope
No migration, environment setting, dependency or backend change.
No publishing performed. Existing application checkbox intentionally retains its
current version until separately requested.

**Ready to publish: No**
This is only part 1 of the three-part terms update. Wait for the supplied sections
4 to 10 before publishing the final terms.
