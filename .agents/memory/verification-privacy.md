---
name: Verification privacy and rollout
description: Durable product and rollout constraints for sensitive vendor documents and availability.
---

Vendor identity and verification documents must remain private to admins. Vendors see only uploaded status, and a deletion must retain the deleting admin and deletion time. Small documents currently live inside the database; backups can still contain older copies after deletion.

**Why:** this data is sensitive and must never be reachable through a public asset URL; an audit trail is required for verification removals.

**How to apply:** protect both metadata and bytes with role checks, never include bytes in general application queries, and treat backup retention as a separate privacy decision if a permanent-erasure guarantee is requested.

Public listing photos and private vendor verification documents are separate storage and access domains. Adding public photo uploads is not permission to move or expose verification documents.

**Why:** the user explicitly required object storage for public listing photos while keeping private verification documents private and unchanged.

**How to apply:** make public-photo storage changes independently; preserve the existing private document route, admin checks and deletion audit.

Production uses an external owner-managed Neon database. Its former owner-applied
SQL rollout rule is superseded by ADR 013 and the automated-migrations memory note.
Private document access and deletion audit rules above are not superseded.
