# 019 Design

Approved simplification recorded in spec.md before implementation.

## Flow and boundaries

Keep POST /api/vendor-applications and FormData unchanged. After existing auth,
refuse admins, then canonicalize the trusted client IP and HMAC it with the
existing SESSION_SECRET. Reserve an IP attempt atomically in Postgres. Only then
invoke existing applicationUpload. After application/document validation, trim
and lowercase the contact email and reserve an email attempt before existing
owner lookup/submission writes. Normalized email is used for these comparisons,
not as permission to act for another owner.

Storage stays in server/storage.ts. A dedicated application-limit service owns
keying, normalization and friendly HTTP responses; it never logs identity.
Use existing crypto, pg/drizzle, Express and zod; no new packages.

## Atomic rolling events

Migration 014 adds application_submission_attempts (serial id, scope ip/email,
64-character keyed digest, timestamptz attempted_at), indexed by
(scope,key_hash,attempted_at), plus expiry index. No existing row changes.
Within each transaction take a transaction-scoped advisory lock for scope/key,
then read database clock after lock acquisition, count events in the relevant
rolling windows and calculate the instant enough events expire for both windows.
Insert only on admission. Collisions of advisory hashes only serialize unrelated
keys; full digests remain separate for counts. Up to ten events per IP/day and
three per email/day, never a new event for denied traffic.

Cleanup deletes at most 500 expired events per admission transaction using
SKIP LOCKED and a 48-hour cutoff. It also runs on denial. Counts always ignore
expired events, so enforcement never depends on cleanup being completed.
This is bounded opportunistic cleanup, not a promise of timed deletion without
traffic. Old limiter state may remain while the application is idle.

## Proxy, privacy and failures

The real DEV probe found three forwarded hops, including internal/loopback
addresses; one-hop req.ip identifies loopback rather than the requester.
For application admission only, walk from the actual socket through trusted
loopback/link-local/private proxy hops, stopping at the first untrusted peer.
Only use this platform path in Replit with the existing trust boundary enabled;
direct public socket peers cannot select a forwarded identity. Reject absent,
malformed or excessively long chains with 503. Canonicalize mapped/equivalent IPs.
The observed edge stripped forged headers on workspace-origin requests, but
these travelled internally and did not match the IP observer's internet egress.
Verification must distinguish internal workspace probes from external browsers.
No raw IP logging or production diagnostic route.
If that observation cannot verify real-client selection, record the blocker;
never guess it passed. No proxy configuration change without evidence.
The development app currently leaves trust proxy disabled, unlike production's
one-hop boundary. Enable that same existing boundary when REPLIT_DEV_DOMAIN is
present so the real development proxy can be tested; local standalone fixtures
remain untrusted by default. Production's setting and limiter policies do not change.

SESSION_SECRET is read at use, scoped HMAC-SHA256 digests only; no fallback if
missing. Scope separates email/IP. 429 includes integer Retry-After, no-store
and friendly readable delay; 503 is generic/no-store, errors contain no keys.
Database failure at IP stage prevents parsing; failure at email stage prevents
data writes. Existing auth/session failures keep their own semantics.

## Alternatives

- In-memory Map: rejected because instances/restarts multiply allowances.
- Preparation and upload tokens: rejected by Madushan; unnecessary protocol.
- Email gate before parsing: cannot know authoritative multipart email without
  parsing; owner explicitly approves after-parser checking.
- Fixed-window counter: rejected because boundary bursts double the allowance.
- Raw IP/email storage or unsalted hashes: rejected for privacy.

## Migration and rollback

Next startup applies new additive 014 under existing tracked runner, DEV only
during implementation. Production gets the same immutable migration on a human
publish; no manual SQL. Existing app versions ignore the extra table. Code
rollback can leave it intact; never edit/drop an applied migration as rollback.
No new secret/settings, no seed edits. Existing SESSION_SECRET is prerequisite.

## Verification map

| Criteria | Evidence planned |
|---|---|
| AC1, AC7 | existing multi-activity regression plus fixture reapplication/admin refusal/create vendor |
| AC2 | instrument parser/body stream in HTTP fixtures, file-first/chunked blocked requests |
| AC3 | changed-IP same-email tests, assert user/vendor/document counts unchanged |
| AC4 | concurrent independent clients and two HTTP apps, reconstructed service, rolling boundary tests using aged fixture timestamps |
| AC5 | injected limiter outage and absent secret, parser/write instrumentation |
| AC6 | browser 429/503 mock with retained File objects and input values, retry button |
| AC8 | stored fields inspection, 48-hour cleanup test and unchanged application documents |
| AC9 | canonicalization/spoof tests and real proxy experiment; no raw identity published |
| AC10 | check/build, migration, onboarding and multi-activity scripts, DEV db:status |
