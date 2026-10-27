---
name: Listing photo bucket isolation
description: Separate development and production buckets for public listing photos.
---

Development and production use separate photo buckets selected by `LISTING_PHOTOS_BUCKET_DEV` and `LISTING_PHOTOS_BUCKET_PROD`; missing configuration must fail closed without cross-environment or default-bucket fallback.

**Why:** The user requires independent development and production photo storage.

**How to apply:** Match database environment detection, create clients only within awaited operations, and run real-storage tests against DEV only.
