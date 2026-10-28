# Verification: public vendor fee copy

Category: Small fix, approved text-only request. No backend, data, schema or
fee-calculation changes. No publish.

## Changes

- `client/src/content/vendor-terms.md`: exact requested three-sentence replacement
  in 5.1; remove the entire 5.9 paragraph and table. Preserve 6.1 and 7.6.
- `client/src/components/navbar.tsx`: add the requested neutral top notice and
  Get started link to /for-vendors. The old launch-offer banner is absent from
  current source, so this is a new notice rather than a literal replacement.
- `client/src/components/stage-one.css`: readable responsive notice styling and
  a 44px link target, using existing colours.
- `script/capture-vendor-terms.cjs`: expect no worked-example table.
- `script/capture-flexible-fees.cjs`: assert no 5.9/example/percentage in public terms.
- `.agents/memory/vendor-fee-policy.md`: retain the owner's public-copy restriction.
- This verification file.

Existing costs text and payment FAQ on /for-vendors, application form, footer,
and other public-page source were checked. No additional vendor-fee percentages,
introductory durations or free/no-fee vendor offers were found. The brand name,
availability free-spots variables, CSS percentages, customer cancellation clause
6.1 and liability clause 7.6 are not vendor pricing promises and remain unchanged.

## Verification

- `npm run check`: pass.
- `npm run build`: pass, existing Browserslist/PostCSS/chunk-size warnings only.
- Exact comparison with git HEAD: only the supplied 5.1 sentences and entire 5.9
  block changed in the terms; 6.1 and 7.6 are byte-for-byte unchanged.
- Source audit: no public vendor fee percentage or introductory duration; only
  the expressly excluded 7.6 lookback and 6.1 cancellation no-fee wording remain.
- Playwright: home, /for-vendors, /for-vendors/apply and /vendor-terms at 1440 and
  375 pixels pass. Neutral banner and link work, no fee percentages or old launch
  wording, no horizontal overflow, no worked-example table. Clause 5.1 contains
  the introductory-offer wording without a duration or no-fee claim.
- Required preview screenshot inspected at 375px: notice readable and link fits.
  Only expected logged-out auth 401 appeared.
- `git diff --check`: pass. No backend, shared schema or migration diff.

## Database and production

No migration, no SQL, no backend or configuration/secret changes. No production
access or publishing. Vendor/admin fee screens and booking snapshots are unchanged.

**Ready to publish: No**
This text change is complete and tested. Existing owner legal/operational release
checks remain; nothing was published.
