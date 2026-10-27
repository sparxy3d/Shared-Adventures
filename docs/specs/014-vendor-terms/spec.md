# Vendor Terms v1.0

Status: done

## Plain-language summary
Replace /vendor-terms with the exact supplied Markdown for sections 1 to 10.
Use normal site styling, a roughly 720px reading column and a desktop contents
list generated from second-level headings. Support bold text, lists and tables
for the supplied content. New applications accept version 1.0 with a timestamp;
earlier acceptance records remain unchanged. The application checkbox opens the
terms in a separate tab. Admin vendor profiles show accepted version and date/time.
Other legal pages remain unchanged.

## Approval
The requester approved this feature in the current request: "Approved, part 1 of 3".
No further specification approval required.
Part 2 was explicitly approved to append sections 4 to 6 only.
Part 3 explicitly approved sections 7 to 10, checkbox wording, new version
recording and the admin acceptance display: "Approved, part 3 of 3. Do not stop
for specification approval." This reuses the existing storage behavior; it adds
no personal data collection or permission, financial or schema changes.

## Boundaries
No backend endpoint, schema, seed, ENABLE_SEED, dependency or publishing changes.
No backfill of existing acceptance records. No implementation of payment,
settlement, notifications, retention automation or insurance checks described in
the approved legal text.

## Acceptance
- Markdown matches all three supplied parts exactly.
- Vendor draft notices and previous content are gone.
- Desktop contents links derive from all ## headings automatically.
- Readable at 1440px and 375px, with screenshots.
- Typecheck and production build pass.
- New applications store version 1.0 and timestamp; old acceptances remain unchanged.
- Checkbox has exact requested wording and opens a new tab.
- Admin vendor profile shows stored version and acceptance date/time in Sri Lanka time.
