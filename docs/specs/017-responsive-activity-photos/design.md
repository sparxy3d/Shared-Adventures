# 017 Proposed design

Status: proposed, not implemented. Subject to Madushan's approval of spec.md.

## Current findings

- Shared activity cards already accept optional photoSrcSet, but default curated paths resolve to originals.
- PublicPhotoGallery handles uploaded srcsets and a curated fallback.
- For vendors uses existing responsive sports artwork plus original rafting, pottery and yoga photos.
- The homepage has intentional 768/1440/2400 hero variants and a responsive sports tile. Preserve that existing art direction.
- The listing editor curated picker, uploaded-photo editor, My Bookings and vendor listing list need explicit responsive coverage.

## Proposed approach

1. Inventory referenced curated activity images and dimensions before generation. Retain originals. Generate static derivatives and a deterministic curated-path manifest using existing development image tooling; no new runtime dependency. Choose compression by side-by-side visual inspection, not just file size.
2. Add a small shared responsive photo component/helper that resolves curated paths through that manifest and accepts existing uploaded srcsets unchanged. Keep source resolution separate from layout and styling.
3. Callers provide accurate sizes, existing classes/object positions, intrinsic dimensions or a reserved aspect ratio, alt text and loading priority. Small picker/booking thumbnails should not claim full viewport width.
4. Preserve existing homepage hero picture sources/preload behaviour. Use the shared renderer where compatible without replacing its special mobile crop. Do not add redundant preloads for every photo.
5. Clear a failed srcset before switching to a responsive fallback to avoid repeatedly requesting a failed candidate.
6. Keep original paths as compatibility inputs. No database URLs are rewritten; existing uploaded /api/listing-images URLs remain server-controlled.

## Boundaries and likely files

Client-only implementation plus generated public assets and development generation/measurement scripts.

- client/src/components/experience-card.tsx
- client/src/components/public-photo-gallery.tsx
- client/src/components/listing-photo-editor.tsx
- client/src/pages/home.tsx and for-vendors.tsx
- client/src/pages/vendor/listing-editor.tsx and listings.tsx
- client/src/pages/my-bookings.tsx
- New focused client image helper/component and static derivative directory

Audit other direct activity-photo uses of these shared components so no named surface retains original downloads. No backend, schema, bucket or document-storage changes.

## Verification mapping

| Criteria | Verification |
|---|---|
| AC1 | Asset dimensions/type inventory; cold-cache request audit excludes original photo downloads |
| AC2 | Compare before/after screenshots at 375/1440 and DPR 1/2; inspect crops and sharpness |
| AC3 | Existing uploaded photo fixture or read-only available listing; inspect srcset/currentSrc and ensure existing guards unchanged |
| AC4 | Network priority/loading attributes and stable reserved boxes; scroll lazy-loading check |
| AC5 | Intercept failed photo responses and verify finite fallback requests |
| AC6 | Picker/gallery/navigation/heart checks; authenticated member/vendor/admin role checks with no real record changes |
| AC7 | Same content, account, browser, viewport, DPR and cache settings before/after; initial and full-scroll bytes including repeated uses |
| AC8 | npm run check, npm run build, changed-file audit and final verification report |

## Measurement details

Capture the baseline before changing assets or call sites. Disable browser cache and service worker interception. Sum actual image response-body bytes, exclude API/HTML/CSS/fonts and separate cached or failed responses. Record whether reported bytes are body or wire-transfer sizes; do not mix them. Use the same dataset for both runs and explain content/API differences. Report totals and reductions per route, viewport and scroll phase, not sums of all files on disk. Use an authenticated existing populated editor without saving changes.

## Decisions

No irreversible architectural choice or new service is proposed, so no new ADR is required. Exact derivative paths and encoding quality will be selected during approved implementation and recorded for reproducibility.
