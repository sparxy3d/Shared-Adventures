# Flexible vendor fees

Status: done

## Plain-language summary

Each vendor has an agreed introductory fee, introductory period and standard fee.
An introductory fee can be zero. Public terms describe the agreement without promising
fixed rates. Admins see a preview before saving; vendors see their own fee and earnings.
Existing bookings keep their original financial snapshots.

## Approval

| Who | Decision | Date | Their words |
|---|---|---|---|
| Madushan | Approved as built | 2026-11-12 | "Approve 015 as built: per-vendor fees 0 to 30%, introductory period 0 to 12 months." |

Category: Risky, because commission validation and vendor-facing financial wording change.

## Acceptance criteria

- Clause 5.1 uses the supplied text exactly; 5.9 is explicitly a 15% example.
  The table and clause 7.6 are unchanged.
- Admin global settings, approval and vendor plans accept fees 0 to 30 inclusive,
  at most two decimal places, and introductory months 0 to 12 inclusive.
- Dashboard wording distinguishes zero-fee introduction, positive introduction,
  pre-publication and no/expired introduction, with singular month handling.
- Approval and vendor detail show the three exact field labels and a live preview.
- Vendor pitch costs use supplied copy, with no fixed percentage or duration.
- New bookings use the vendor's effective plan; existing bookings are unchanged.
- Capture the requested screens at 1440 and 375 pixels.

## Out of scope

Publishing, payments, production access, seed code, ENABLE_SEED, schema changes,
backfilling or clamping existing plans and booking snapshots.
