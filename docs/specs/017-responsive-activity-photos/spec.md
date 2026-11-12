# 017 Responsive activity photos

- Status: done (development only, not published)
- Category: Risky (tier 2), shared presentation across public, member, vendor and admin areas
- Requested by: Madushan
- Created: 2026-11-12

## Plain-language summary

Activity photos should download faster on phones without changing their subjects, crop, colours, layout or captions. This covers activity cards, activity detail, For vendors, the listing editor photo picker, My Bookings and vendor listings, including admin uses of the shared editor. Smaller copies of curated photos will be kept in the project; original files will remain for rollback. Vendor-uploaded photos will continue using their existing stored sizes. Main hero photos load first; photos below the visible area load as needed. No database, pricing, login, permission, upload or storage-setting changes are proposed. The main risks are blurry images, changed crops and browsers downloading unnecessarily large copies.

## Approval

| Who | Decision | Date | Their words |
|---|---|---|---|
| Madushan | Approved; implementation on hold | 2026-11-12 | "Spec 017 approved as written, 12 Nov 2026. Do not start building it yet; one more request comes first." |
| Madushan | Go-ahead to implement | 2026-11-12 | "start 017" |

Madushan instructed implementation to begin on 12 November 2026. Spec 018 is complete.

## Problem

Most curated listing photos are large PNG originals. Inspection found rafting.png at 2,441,425 bytes, golf.png at 2,045,843 bytes and fallback.png at 2,062,976 bytes. Some call sites support responsive vendor images, but curated photos often load originals even in small thumbnails. Phone visitors download more image data than these display sizes require.

## Outcome

The named screens display the same photos at appropriate resolution with measurably smaller image downloads.

## Scope

In:
- One-time 400, 800 and 1600 px WebP derivatives for curated activity photos and the fallback, with a reproducible generation method.
- Shared responsive photo rendering for curated and vendor-uploaded photos across all named surfaces, including homepage/category/activity cards and shared admin editor uses.
- Appropriate loading priority, reserved image space, accessible alternatives and safe missing-image handling.
- Before/after image-download measurements for For vendors, home and the listing editor.

Out:
- Database/schema/migrations, seed.ts, ENABLE_SEED, backend routes, uploaded-photo processing, bucket configuration or production changes.
- Replacing photos, redesigning screens, changing crops, rewriting listing data or removing originals.
- Re-encoding logos/icons or replacing the existing responsive homepage hero artwork.
- Publishing, payment changes or new runtime dependencies.

## Scenarios

| # | As a | I want to | So that |
|---|---|---|---|
| S1 | Phone visitor | Download appropriately sized photos | Explore without downloading large originals |
| S2 | Member | See crisp booking thumbnails | Recognise my booked activity |
| S3 | Vendor or admin | Browse the photo picker and listings efficiently | Edit without waiting for original PNG files |
| S4 | Vendor using uploads | Keep existing images working | Avoid re-uploading or changing storage |

## Acceptance criteria

- AC1. WHEN a curated activity photo appears on an in-scope screen THE SYSTEM SHALL offer 400, 800 and 1600 px WebP copies without requesting its original PNG/JPEG in the successful normal path.
- AC2. WHEN shown at 375px, 1440px or high pixel density THE SYSTEM SHALL preserve the original photo, crop, focal position, aspect ratio, labels, alt text and layout without visible quality loss at the intended display size.
- AC3. WHEN a vendor-uploaded photo is displayed THE SYSTEM SHALL use its existing responsive URLs without changing any record, upload operation, ownership guard or bucket choice.
- AC4. WHEN the initial viewport loads THE SYSTEM SHALL prioritise its primary hero/detail photo and reserve image space; photos below the fold SHALL load lazily. Existing homepage hero art direction SHALL remain intact.
- AC5. WHEN an image is missing or fails THE SYSTEM SHALL show the existing fallback without a request loop or a broken layout.
- AC6. WHEN using the picker, gallery, cards, My Bookings or vendor listing list THE SYSTEM SHALL preserve selection, navigation, save/heart and gallery behaviour.
- AC7. WHEN measuring For vendors, home and the same populated listing editor before and after THE SYSTEM SHALL produce a report of image response-body bytes, request count and largest image at 375px and 1440px, with cold-cache initial-viewport and full-page-scroll measurements. Report the percentage reduction for each case; investigate regressions rather than claiming unmeasured gains.
- AC8. WHEN verification finishes THE SYSTEM SHALL pass typecheck and build and report visual checks and any untested surfaces. No application implementation occurs before approval.

## Constraints

| Area | Requirement |
|---|---|
| Ownership | Read existing listing photos only; no customer/vendor data mutation |
| Authorization | Existing public, member, vendor and admin gates unchanged |
| Data and migrations | None; keep stored curated paths and original assets valid |
| Money | None |
| Personal data | None newly collected; private verification documents untouched |
| Production needs | Normal human-controlled publish only; no new secret, setting, bucket or migration |
| Compatibility | Both curated paths and existing uploaded image srcsets; retain homepage hero variants and crops |

## Open questions

None requiring a product decision beyond approval. Proposed assumptions: visual equivalence means no noticeable quality change, not byte-identical lossy compression; no upscaling a source smaller than a requested derivative. Record any smaller-source exception.

## Notes

Madushan proposed generating 400/800/1600 px WebP copies once, using one shared component, prioritising heroes and lazy-loading other photos. Storage remains environment-isolated as documented in the photo bucket memory note.
