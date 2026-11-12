# 018 Proposed design

Status: implemented following Madushan's recorded 2026-11-12 approval.

Approved amendment: replace only the "How do I get paid?" FAQ answer with "Payment arrangements will be confirmed with you before your first booking." Audit other public commitments without changing them.

Use the existing markdown renderer and its generated heading index. Replace client/src/content/vendor-terms.md entirely with the exact spec text, preserving the old version in Git history rather than publishing contradictory archived terms on the same route.

Update the checkbox and its directly related client validation language in client/src/components/vendor-application-form.tsx. Set shared/catalog.ts VENDOR_TERMS_VERSION to "1.1-draft" after approval. Inspect the application handler's existing server-generated timestamp/version recording and any validation wording before changing anything; preserve its format and guards. No database migration or historical record update.

Confirm admin and vendor terms views display stored versions, not the new global constant for historical submissions. Record wording limitations if existing metadata calls this "acceptance"; do not silently relabel an old agreement as reading the draft.

Verification: AC1/AC5 by content audit and desktop/phone browser checks; AC2 by checkbox/link/error checks; AC3/AC4 by isolated development application test and historical fixture comparison, never production data; AC6 by typecheck, build and changed-file audit.

Risks: a new page does not automatically resolve the legal effect of old acceptances; production remains unchanged until a separate human publish. Do not alter retention jobs, payments, company data or other pages to make the document appear accurate.
