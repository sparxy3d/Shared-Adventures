---
name: Verification privacy and rollout
description: Durable product and rollout constraints for sensitive vendor documents and availability.
---

Vendor identity and verification documents must remain private to admins. Vendors see only uploaded status, and a deletion must retain the deleting admin and deletion time. Small documents currently live inside the database; backups can still contain older copies after deletion.

**Why:** this data is sensitive and must never be reachable through a public asset URL; an audit trail is required for verification removals.

**How to apply:** protect both metadata and bytes with role checks, never include bytes in general application queries, and treat backup retention as a separate privacy decision if a permanent-erasure guarantee is requested.

Production uses an external owner-managed Neon database. Development schema changes are applied to development only; the production owner applies reviewed SQL separately before release.

**Why:** the user explicitly reserves production schema changes for their own rollout and forbids production db:push in this stage.

**How to apply:** never assume development schema changes propagate on publishing. Keep a reviewed migration and verify development before handing over production steps.
