# 019 Vendor application abuse limits

- Status: done (development only, not published)
- Category: Risky (tier 2)
- Requested by: Madushan
- Created: 2026-11-13

## Plain-language summary

Anyone can still apply without logging in, using the existing form and upload.
Before reading documents, shared checks allow three application attempts per
internet address per rolling hour and ten per rolling 24 hours. After parsing,
a shared email limit allows three attempts per rolling 24 hours before any user,
vendor or document is created. These limits work across servers and restarts.
People see friendly retry times without losing entered values or attached files.
Admins keep their existing create-vendor flow; declined applicants can reapply
within the public limits. New short-lived database records contain hashed keys,
not additional plain IPs or emails. Email-limited attempts can still buffer
documents, but remain subject to the earlier IP limits.

## Approval

| Who | Decision | Date | Their words |
|---|---|---|---|
| Madushan | Approved with simplification | 2026-11-13 | Madushan approved, 13 Nov 2026: “Approve spec 019 with this simplification. (1) Keep the shared Postgres-backed per-IP limits checked before the document parser: 3 per rolling hour and 10 per rolling 24 hours. (2) Check the 3-per-24-hours email limit after parsing but before creating any user, vendor or document, with no preparation step and no upload permission tokens; the form posts as it does today. (3) Keep the hashed keys, 48-hour cleanup, fail-closed 503, friendly 429 with retry time, preserved form values and files, and verifying the real client IP behind the Replit proxy. (4) Keep the admin create-vendor flow and the existing refusal of admins on the public form. (5) Update the spec, design and tasks to match before building. Login and waiting-list limiters stay out of scope.” |

This approval replaces the earlier preparation/token proposal entirely.

## Problem and outcome

Anonymous multipart requests currently buffer up to three 10MB documents and can
create placeholder owners, vendors and private database documents without any
application limiter. Production runs multiple autoscale instances, so an
in-memory counter cannot enforce a shared limit. Outcome: repeated attempts are
bounded before document parsing by IP, and by email before application writes.

## Scope

In:
- Independent shared rolling IP windows and a normalized-email window.
- IP gate before `applicationUpload`, email gate after parsing/validation and
  before user/vendor/document writes. Malformed uploads spend their IP attempt.
- Friendly 429 with Retry-After, fail-closed 503 on limiter failure, no-store
  responses, preserved values/files, bounded cleanup of state older than 48 hours.
- Verification of trusted proxy IP handling, concurrency, restart persistence,
  admin compatibility and declined-vendor reapplication.
- An additive numbered migration and matching shared schema.

Out:
- Preparation endpoints, upload tokens, new form protocol, CAPTCHA or email sending.
- Login and waiting-list limiter changes.
- Seed/ENABLE_SEED, money, document storage/retention/access changes.
- New admin permissions, anonymous quota exemptions, new services or secrets.
- Production execution, secret/settings changes or publishing.
- Global storage budgets or protection against unlimited unrelated IPs/emails.

## Scenarios

| As a | I want to | So that |
|---|---|---|
| Applicant | Apply without login | Onboarding stays simple |
| Applicant correcting a problem | See when to retry and retain my input/files | I need not start again |
| Declined owner | Resubmit my own application | Existing reapplication still works |
| Admin | Create vendors through the guarded workflow | Staff onboarding is unaffected |
| Owner | Share limits across instances/restarts | Parallel servers cannot multiply allowances |

## Acceptance criteria

- AC1. WHEN an eligible applicant submits within limits THE SYSTEM SHALL accept
  the unchanged multipart form and preserve existing validation/transaction/terms.
- AC2. WHEN an IP has made three admitted attempts in a rolling hour or ten in
  a rolling 24 hours THE SYSTEM SHALL return 429 with Retry-After before invoking
  Multer or reading files into application buffers, including chunked/file-first
  bodies. Changing the email SHALL NOT bypass this.
- AC3. WHEN a validated contact email has made three attempts in a rolling
  24 hours THE SYSTEM SHALL return 429 before any owner/vendor/document write,
  even across different IPs. Comparison trims and lowercases without provider
  alias rewriting. This approved gate occurs after document parsing.
- AC4. WHEN parallel requests use independent database clients/instances or a
  process restarts THE SYSTEM SHALL atomically enforce rolling windows without
  overshoot, using database time. Denied requests SHALL NOT accumulate unbounded
  event rows or extend a lockout indefinitely.
- AC5. WHEN limiter state cannot be checked or the hashing secret/IP is unusable
  THE SYSTEM SHALL refuse admission with friendly 503, never admit unchecked or
  fall back to local memory. IP-stage failure SHALL occur before the file parser;
  email-stage failure SHALL occur before application writes.
- AC6. WHEN a limit is reached THE SYSTEM SHALL show a friendly inline message
  and retry time, without exposing which email/IP key matched, preserve all
  entered values and chosen files while mounted, and allow manual retry. No
  automatic upload retry loop or forced page reload.
- AC7. WHEN an admin submits to the public endpoint THE SYSTEM SHALL preserve
  refusal, before parsing where practical; the guarded admin create-vendor flow
  SHALL remain unaffected. Logged-in owners with rejected applications SHALL
  retain existing reapplication/ownership rules within limits.
- AC8. WHEN enforcement records are stored THE SYSTEM SHALL store only scoped
  keyed digests and timestamps, no additional raw IP/email, bodies or documents,
  and no enforcement identity in logs. Records older than 48 hours SHALL be
  removed by bounded cleanup during traffic; expired events stop counting even
  before deletion. No original application/document deletion.
- AC9. WHEN a client supplies forwarding headers or equivalent IPv4/IPv6 forms
  THE SYSTEM SHALL not allow arbitrary quota identity selection. Verify the
  actual Replit proxy path and supported trusted-header behaviour, not only
  synthetic direct requests. Do not blindly trust leftmost X-Forwarded-For.
- AC10. WHEN verification finishes THE SYSTEM SHALL pass typecheck/build, new
  disposable-DEV concurrency/boundary/outage/cleanup/parser-order tests, existing
  application/document regression tests, and migration tests. DEV migration
  status shows no pending files; no production migration is executed by the agent.

## Constraints

| Area | Requirement |
|---|---|
| Ownership | Existing session identities and storage ownership checks; no body-supplied role bypass |
| Authorization | Public form remains public; admin guards, public admin refusal and forced-password rules unchanged |
| Data and migrations | New expiring application attempt events with scope/digest/time indexes in next free `014_application_submission_limits.sql`; matching shared schema; no applied-file edits |
| Money | None |
| Personal data | Keyed digests with existing SESSION_SECRET, never insecure fallback; pseudonymous, not anonymous; no raw enforcement identities logged. Rotation resets identities. Retention only for limiter state |
| Production needs | Existing SESSION_SECRET and automatic additive migration; no new secrets/services/settings/manual SQL |
| Compatibility | Existing multipart clients, legacy and multi-activity payloads continue; existing applications, documents and terms acceptances unchanged |

## Login and waiting-list assessment

Login currently uses an in-memory ten-per-15-minutes combined IP/email key.
Notify me uses an in-memory thirty-per-IP-per-hour counter. Both reset per
instance/restart; waiting-list deduplication does not stop distinct-email floods.
Both should eventually use shared enforcement, with separately approved
thresholds, lockout/UX and security tests. Neither endpoint changes in this spec.

## Open questions

None requiring further product approval. Actual proxy identity must be verified
as an implementation acceptance condition; unresolved verification blocks a
Ready to publish: Yes verdict.

## Notes

The earlier spec's 10-minute permissions and preparation quotas are removed, not
silently deferred. Email attempts are counted after valid application/document
input, before writes; malformed input still consumes the early IP allowance.
Public admin refusal precedes limiting/parsing. IP and email stages deliberately
are separate, so email rejection does not refund the already consumed IP attempt.
This is bounded abuse mitigation, not a guarantee against distributed floods.
