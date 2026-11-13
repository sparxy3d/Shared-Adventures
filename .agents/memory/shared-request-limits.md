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

Do not equate workspace internet egress with the source seen on a Replit DEV
request. Observe the same ingress path independently when verifying proxy
identity, and test forged forwarding chains instead of trusting a hop count.

**Why:** an external IP observer disagreed with DEV ingress because workspace
requests travelled internally; the existing one-hop setting saw loopback.
An isolated same-ingress probe separated that observation issue from quota logic.

**How to apply:** use controlled DEV probes without raw-IP logging, restore the
normal workflow immediately, and do not claim production-path instrumentation
when only the actual development proxy was exercised.
