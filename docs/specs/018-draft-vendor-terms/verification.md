# 018 Verification

## Summary

Implemented the exact approved four-section draft, version 1.1-draft, reading acknowledgement and amended payment FAQ in development. No production access, publish, schema/migration, secret, setting, fee-calculation or seed changes. Spec 017 remains on hold and no photo work started.

## Changed files

- client/src/content/vendor-terms.md: exact proposed replacement; no effective date, company claim, payment/payout/deadline/retention commitments.
- client/src/components/vendor-application-form.tsx: exact draft acknowledgement, same new-tab link and required checkbox; client validation refers to reading.
- client/src/pages/for-vendors.tsx: exact approved payment FAQ, How it works step 3 heading/body and What it costs lede.
- client/src/components/booking-request-dialog.tsx: replaced the few-hours response expectation with "The vendor will confirm or decline your request."; "No payment now." unchanged.
- shared/catalog.ts: future version identifier 1.1-draft.
- server/routes.ts: acknowledgement validation error text only; timestamp/recording behaviour and guards unchanged.
- script/test-multi-activity-applications.ts: new-version timestamp test and preservation of a historical 1.0 fixture through approval and further submissions.
- script/capture-vendor-terms.cjs: current draft checks, historical/new admin version display, desktop/phone screenshots; browser executable now uses CHROMIUM_PATH or the installed Chromium wrapper instead of an obsolete Nix path.
- script/capture-flexible-fees.cjs: obsolete final-terms clause assertion updated to the new draft fee statement; financial checks unchanged.
- docs/specs/018-draft-vendor-terms/{spec,design,tasks,verification}.md: approval, amendment, implementation and evidence.

## Checks

- npm run check: passed.
- npm run build: passed; existing browser data/PostCSS/chunk-size warnings remain.
- NODE_ENV=development npx tsx script/test-multi-activity-applications.ts --screenshots: passed all application validation, two-draft approval, version/timestamp preservation and legacy-application checks. Uses disposable development schema, no seed imports; fixture cleaned up after browser capture.
- node script/capture-vendor-terms.cjs <disposable fixture>: checked four sections, exact draft notice/version, removed commitments/table, no horizontal overflow, desktop heading index, checkbox/new-tab link and admin stored historical 1.0/new 1.1-draft timestamps at 1440px and 375px. Screenshots: generated-artifacts/vendor-terms-draft/{top,checkbox}-{1440,375}.jpg.
- Exact approved markdown comparison and git diff --check: passed.
- Main workflow restarted once after server validation text change and served port 5000 normally.
- Development preview retains an existing React Fragment/data-replit-metadata warning; renderer was not changed. Expected logged-out auth check returns 401. No unrelated fix.
- Flexible-fee browser script itself was not rerun; only its now-obsolete terms-content assertion was updated. Fee/booking calculations were not changed.

## Approved text follow-up, 2026-11-12

Madushan's exact approval is recorded in spec.md. Updated the step 3 heading to "We agree payment with you", its body to "We’ll confirm how and when you’re paid before your first booking.", the costs lede to "No upfront costs. We agree your fee plan with you when we approve your listing.", and the booking sentence to "The vendor will confirm or decline your request."

Re-ran npm run check and npm run build: both passed. Browser checks at 1440px and 375px confirmed exact For vendors text and no horizontal overflow. A source assertion checked the booking text and removal of its old few-hours sentence. Both "within 2 working days" lines were compared with HEAD and confirmed unchanged. The booking dialog was not opened in this follow-up browser check; only its text source changed. Prior version/acknowledgement tests remain applicable because those files and behaviours did not change.

No additional production configuration, migration, backend or database changes. No publish. Spec 017 remains on hold.

## Other public wording found, left unchanged after follow-up

| Location | Current text | Concern |
|---|---|---|
| client/src/pages/for-vendors.tsx, How it works step 3 label | "03 / AFTER THE SESSION" | Existing step label retained; heading/body now defer how and when payment occurs |
| shared/catalog.ts, application success message | "Thanks. We'll call you within 2 working days to talk it through." | Response deadline |
| client/src/components/vendor-application-form.tsx, submit note | "We will review your application and contact you within 2 working days. Your details are handled in line with our Privacy Policy." | Response deadline |
| client/src/components/booking-request-dialog.tsx, review | "No payment now. The vendor will confirm or decline your request." | No immediate payment; no confirmation deadline |
| client/src/components/booking-request-dialog.tsx, dialog description | "Request only, no payment" | Current no-payment statement, not a payout promise |
| client/src/pages/legal.tsx, /terms | "The final terms will explain cancellations, payments, responsibilities and dispute handling in detail." | Future policy-content statement; Terms remains a working draft |
| client/src/pages/legal.tsx, /privacy | "Before the marketplace launches fully, the final policy will describe data retention, service providers, security and your applicable privacy rights." | Future policy-content statement, not a retention period; Privacy remains a draft |

Source audit found no other hard-coded public registered-company details, weekly payout promises or concrete document/backup retention periods after replacement. Audit covered public client pages/components/content/shared public copy, not arbitrary database-authored listing text. No production database queried.

## Assumptions and limits

The historical database text format continues to say "Vendor terms (...) accepted" for compatibility, including new draft acknowledgements. It now records 1.1-draft, and the applicant-facing checkbox explicitly says read, not agree. No existing acceptance is relabelled or overwritten. Admin and vendor parsers use the stored record and support the new identifier.

No lawyer review, vendor notification or legal conclusion about earlier acceptances was performed. Suggested notice remains in spec.md for owner/lawyer review. Replacing public copy does not automatically void earlier commitments.

Production needs no migration or new configuration; it will require a separate human publish. Existing live terms remain unchanged until then.

**Ready to publish: Yes** for the approved draft-terms and text-only scope of 018. This is technical readiness to publish a non-effective draft, not legal approval of final terms or a conclusion about existing acceptances. The two-working-day wording is intentionally retained by Madushan. The correction notice to previous acceptors still needs owner/lawyer review and has not been sent. Publishing remains a separate human action.
