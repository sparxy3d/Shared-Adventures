# 018 Draft vendor terms under legal review

- Status: done (development only, not published)
- Category: Risky (tier 2), legal representations and recorded terms acknowledgement
- Requested by: product owner
- Created: 2026-11-12

## Plain-language summary

Replace the public Vendor Terms with a short draft that is clearly not in effect. Keep only application review, vendor-set prices, private verification documents and individually agreed fees. Remove registered-company claims and commitments about payments, payouts, response times, retention and backups. New applicants acknowledge reading the draft rather than agreeing to final terms. Preserve every existing version 1.0 acceptance exactly as recorded. No database migration, fee calculation, booking change or automatic notification is proposed. Spec 017 remains on hold.

## Approval

| Who | Decision | Date | Their words |
|---|---|---|---|
| Madushan | Approved with amendments | 2026-11-12 | "Spec 018 approved, 12 Nov 2026, with two amendments: (1) also replace the For vendors FAQ answer to ‘How do I get paid?’ with ‘Payment arrangements will be confirmed with you before your first booking.’, and list (without changing) any other public text that promises payments, payouts, response deadlines, retention or registered company details; (2) keep the draft text and version 1.1-draft exactly as proposed. Build 018 now; 017 stays on hold until 018 is done." |
| Madushan | Approved text follow-up | 2026-11-12 | "Go ahead, Madushan, 12 Nov 2026. Small fix, text only, as part of 018: (1) For vendors “How it works” step 3: heading “We agree payment with you”, text “We’ll confirm how and when you’re paid before your first booking.” (2) For vendors “What it costs”: replace the lede with “No upfront costs. We agree your fee plan with you when we approve your listing.” (3) Booking request dialog: replace “The vendor usually confirms your request within a few hours.” with “The vendor will confirm or decline your request.” (4) Keep “within 2 working days” unchanged. Then update 018’s verification and tell me if it is ready to publish." |

Approval recorded before implementation. Scope includes the exact FAQ replacement, the three approved follow-up text changes above and a read-only audit of other public commitments. Other public copy, including "within 2 working days", stays unchanged.

## Problem and outcome

The requester states that the lawyer has not checked the website terms and company registration is pending. Current version 1.0 presents an effective date, a registered company and operational commitments that cannot yet be confirmed. Two vendors have already accepted version 1.0, according to the requester.

Outcome: the page describes current facts as a non-effective draft, and new acknowledgements cannot be confused with the existing version 1.0 acceptances.

## Scope

In: replace the complete vendor terms content; update checkbox and directly related acknowledgement validation text; change the recorded version for future submissions; check version display in admin/vendor views; prepare a notice for the two vendors.

Out: changing or deleting historical acceptances, identifying/contacting vendors automatically, determining enforceability, revising other public pages, changing booking/payment/fee logic, database/schema changes, publishing.

## Exact proposed replacement content

```markdown
# Draft vendor terms

**Draft vendor terms, under legal review, not yet in effect**

**Version 1.1-draft**

This draft describes current arrangements only. It is under legal review and is not yet in effect.

## 1. Applications

Free Spirit reviews vendor applications before approving them.

## 2. Your prices

Vendors set their own activity prices.

## 3. Verification documents

Verification documents are kept private and used for verification. Only authorised Free Spirit admins can view them. They are not published or shown to customers.

## 4. Fees

Fees are agreed individually with each vendor.
```

## Scenarios and acceptance criteria

- AC1. WHEN anyone visits /vendor-terms THE SYSTEM SHALL show the exact replacement content above, without an effective date, registered entity claim or the removed contractual commitments.
- AC2. WHEN applying THE SYSTEM SHALL label the checkbox exactly "I have read the draft vendor terms", with "draft vendor terms" linking to /vendor-terms in a new tab. The existing required checkbox remains required; related errors SHALL describe reading the draft, not accepting effective terms.
- AC3. WHEN a new application succeeds THE SYSTEM SHALL record version "1.1-draft" and the existing server-generated acknowledgement timestamp through the current recording mechanism.
- AC4. WHEN viewing an older acceptance THE SYSTEM SHALL preserve and display its original version and timestamp. No backfill or reinterpretation of version 1.0 is permitted.
- AC5. WHEN showing the page at 375px and 1440px THE SYSTEM SHALL retain readable typography, existing navigation and a correct generated section index, with no horizontal overflow.
- AC6. WHEN verification finishes THE SYSTEM SHALL report typecheck/build results, new-versus-historical acknowledgement tests and screenshots of the page and checkbox. No application change or publish before approval.

## Constraints

| Area | Requirement |
|---|---|
| Ownership | No change to access or ownership of vendor data |
| Authorization | Existing guards unchanged |
| Data and migrations | No schema/migration expected; existing version string and timestamp recording |
| Money | No calculation, fee-plan or booking-snapshot changes |
| Personal data | No new collection; verification storage unchanged |
| Production needs | Human-controlled publish after approval and checks; no new secrets/settings |
| Compatibility | Existing 1.0/0.9 records remain readable; link stays /vendor-terms |

## Open questions and assumptions

Madushan approved the exact draft and "1.1-draft" version identifier on 2026-11-12. This is a replacement public notice, not a conclusion that historical obligations disappear. A lawyer must advise on the effect of the two existing acceptances and whether individual agreements or corrective steps are needed. Until publishing occurs, the live page is unchanged.

## Proposed notice to the two vendors

> We need to correct the Vendor Terms we previously asked you to accept. Version 1.0 was published before legal review was complete, and company registration is still pending. It included commitments about payments, payouts, response times and document retention that we cannot currently confirm. We are replacing the public page with a clearly marked draft that is under legal review and not yet in effect. Your existing acceptance record will be kept unchanged. Your activity prices remain yours to set, and fees are agreed individually with you. Please do not rely on the unconfirmed operational commitments while we clarify them with our lawyer. We will contact you about any terms that require your agreement once that review is complete. Please tell us if you have already relied on any of the earlier commitments so we can address that with you directly.

This suggested communication is general information, not legal advice. Ask the lawyer to review it and the implications of the earlier acceptances. Do not claim the earlier acceptances are automatically void.
