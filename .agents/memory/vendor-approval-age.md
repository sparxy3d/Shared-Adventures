---
name: Vendor approval age
description: Approval-age decisions without a dedicated approval timestamp
---

Use an explicit, recorded approval time when judging how long an approved vendor has not been live. Exclude approvals with unknown dates rather than treating their application submission date as approval.

**Why:** The existing schema has no approval-time column. An application may have waited for review, so its submission time cannot establish when it was approved.

**How to apply:** Keep the first recorded approval time when approving an application or creating a vendor manually. Treat older approvals with no recorded time as unknown in time-based alerts until there is a verified source for their approval time.
