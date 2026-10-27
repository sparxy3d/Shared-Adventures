# Rollout amendment

ADR 013 supersedes this ADR's owner-applied production SQL instructions only.
Use immutable tracked startup migrations and the one-time baseline. Privacy and
document access/deletion decisions below remain unchanged.

# Private verification documents and vendor availability

Use PostgreSQL bytea for bounded verification documents in this prototype.

**Why:** the app already uses private external Neon databases; transactional document/application creation avoids orphaned identity documents and needs no public bucket or new storage credentials. This increases database and backup size; reconsider encrypted object storage if volume grows.

Deleted contents are nulled, while deletion actor and time remain. Database backups may retain historical contents until their retention expires. Operational backup access must remain restricted.

Taking bookings defaults true, independent of approval/pause. Vendor row locks serialize switches with new bookings, preserving existing bookings.
