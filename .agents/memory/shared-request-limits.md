---
name: Shared request limits
description: Production multi-instance constraint supplied by Madushan for abuse prevention.
---

Madushan states that production runs on Replit autoscale with more than one
instance. Request limits must therefore be shared between instances and survive
restarts; a process-local counter does not meet this requirement.

**Why:** the owner supplied this operational constraint when requesting safeguards
for anonymous vendor application uploads on 2026-11-13.

**How to apply:** use this constraint when scoping or approving abuse controls.
Thresholds and mechanisms proposed in a pending spec are not approved merely
because this operational fact is recorded here.
