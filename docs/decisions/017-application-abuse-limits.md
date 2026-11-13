# 017 Shared application admission

Status: accepted by Madushan, 2026-11-13 (spec 019 approval).

Use shared Postgres rolling event admission for application uploads: IP before
Multer, email after parsing and before application writes. No preparation/token
protocol. Three/IP/hour, ten/IP/day, three/email/day. Store scoped keyed digests,
use existing SESSION_SECRET and fail closed if enforcement is unavailable.

Why: multi-instance autoscale and restarts make local counters ineffective.
The email remains inside existing multipart metadata, so checking it after
parsing is the explicitly approved simplicity tradeoff. Early IP enforcement
still bounds document buffering. Email-only refusal does not avoid buffering.

Cleanup is opportunistic, bounded, for records older than 48 hours; idle services
do not run a deletion scheduler. Original application/document retention is
unchanged. Login/waiting-list controls remain separately scoped future work.
