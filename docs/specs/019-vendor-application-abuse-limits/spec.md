# 019 Vendor application abuse limits

- Status: awaiting approval
- Category: Risky (tier 2)
- Requested by: Madushan (owner), relayed in this request
- Created: 2026-11-13

## Plain-language summary

Real vendors can still apply without creating an account. Before documents are
uploaded, the site checks how often applications have been attempted from the
same internet address and email address. These checks are shared between servers
and survive restarts. The proposed limits are three upload attempts per hour and
ten per 24 hours from an internet address, plus three per 24 hours for an email
address. People who hit a limit see when they can try again, without losing their
form or attached files. Declined applicants can still reapply when logged in, and
admins keep their existing create-vendor workflow. This adds small database
records for abuse prevention, without changing prices, fees, document privacy or
approval rules. The main risk is temporarily blocking genuine applicants who
share an internet connection, so the limits and retry messages need approval.

## Approval

| Who | Decision | Date | Their words |
|---|---|---|---|
| Madushan | Awaiting approval | 2026-11-13 | No implementation approval received. |

Risky changes need Madushan's approval in this table before any code changes.
This request authorizes investigation and specification, not implementation.
Thresholds below are proposed for approval, not an existing product rule.

## Problem

The public application endpoint currently buffers as many as three 10MB
documents before validating the application or checking its existing owner.
Documents are then stored privately in Postgres alongside the application
transaction. There is no application rate limit, so repeated submissions with
different emails can consume server memory and database space. Production uses
multiple autoscale instances, so a process-local counter would not enforce a
consistent limit and would reset on restart.

## Outcome

Repeated or blocked application attempts cannot reach the document-buffering
step, while genuine anonymous applicants, eligible logged-in reapplicants and
existing admin onboarding continue to work.

## Scope

In:

- Shared Postgres-backed limits on the public vendor application flow, enforced
  before Multer reads documents into memory.
- Independent IP and normalized contact-email limits, not one combined IP/email
  key. Changing one must not bypass the other.
- A small email-only preparation step that checks/reserves permission before
  sending a multipart upload. The email is currently inside multipart JSON and
  cannot safely be used for pre-upload limiting without this protocol change.
- A short-lived, opaque, single-use upload permission tied to the checked email,
  IP and caller/session context. No file data is sent during preparation.
- Friendly limit/service-unavailable feedback, a server retry time, and browser
  preservation of entered values and selected files.
- Bounded, expiring abuse-prevention records, concurrent-request and
  multi-instance tests, and updated documentation.
- Assessment of the existing login and waiting-list limiters, documented below.

Out:

- Migrating the login or waiting-list limiter in this implementation.
- Login/password/session behaviour changes, new admin powers, changing who may
  apply, or exempting anonymous requests based on body-supplied identity.
- CAPTCHA, email verification/sending, external anti-bot services, public
  document URLs, object-storage conversion, payment or fee changes.
- Changing application fields, activity approval, document type/size rules,
  existing application/document retention or deleting any existing application.
- A global daily storage budget, global traffic admission control or a guarantee
  against distributed attacks using many unrelated IPs and emails.
- Production data/settings/secrets changes, publishing, seed or ENABLE_SEED changes.

## Scenarios

| # | As a | I want to | So that |
|---|---|---|---|
| S1 | Genuine logged-out applicant | Apply with my documents without logging in | Onboarding stays straightforward |
| S2 | Applicant correcting a mistake | Keep what I entered and see a clear retry time | A failed upload does not make me start over |
| S3 | Declined applicant with an account | Log in and resubmit my own application | Existing reapplication remains possible |
| S4 | Admin | Keep using the guarded create-vendor workflow | Public traffic does not stop staff onboarding |
| S5 | Owner | Enforce the same limits on every instance and after restarts | Parallel requests cannot multiply allowances |
| S6 | Owner | Reject blocked uploads before their files are buffered | Rejected attempts do not consume document memory/storage |

## Proposed limits and responses

These values require Madushan's approval:

| Limit | Proposed value |
|---|---|
| Per IP, short window | 3 upload reservations per rolling hour |
| Per IP, long window | 10 upload reservations per rolling 24 hours |
| Per normalized contact email | 3 upload reservations per rolling 24 hours, across all IPs |
| Preparation requests per IP | 30 per rolling 10 minutes, including malformed/denied preparation attempts |
| Upload permission lifetime | 10 minutes |
| Reuse | One admitted upload only; simultaneous/replayed uses refused before file parsing |
| Retention of abuse records | Maximum 48 hours, with bounded opportunistic cleanup during requests; no external scheduler |

All eligible public applicants, including logged-in declined vendors, use the
same public limits. Authenticated identity does not grant an unlimited-upload
bypass. A successful reservation uses an attempt even if it expires unused or
the later upload fails validation or is interrupted. The browser validates the
form first to avoid spending attempts on missing fields. Invalid preparation
data consumes the cheap preparation-request allowance, but does not create an
application-upload reservation. An IP-blocked request must not insert an
email-counter row for an attacker-chosen new email.

Preparation does not create placeholder users, vendors, documents or new
anonymous session rows. Anonymous permissions bind to the normalized IP and
checked email; authenticated permissions also bind to the existing session/user.
They are unpredictable bearer permissions, never an email-verification claim.

Use rolling windows, measured against database time, rather than allowances
that double across a fixed hour/day boundary. Retry time is the earliest instant
when all exhausted limits permit another reservation, rounded up for the
Retry-After header and a readable local countdown/time in the browser.

Proposed public messages, without revealing whether an email already exists:

- HTTP 429: "Too many application attempts. Please try again in {time}, or contact hello@freespirit.club for help."
- HTTP 503: "We can't accept your application right now. Please try again shortly."
- Missing, expired, mismatched or reused upload permission: "Please try sending your application again. Your details and files are still here."

The browser must show the server's safe message rather than its current generic
network-failure text. No automatic retry loop or automatic resubmission of files.
The preparation and upload responses use `Cache-Control: no-store`.

## Acceptance criteria

- AC1. WHEN a valid first-time anonymous applicant submits a complete form within
  the limits THE SYSTEM SHALL prepare and send it without login or a visible
  extra step, retaining existing successful application and terms-version behaviour.
- AC2. WHEN either IP window is exhausted THE SYSTEM SHALL return 429 with
  Retry-After before invoking the document parser, even when the email changes.
- AC3. WHEN the email window is exhausted THE SYSTEM SHALL return 429 with
  Retry-After before invoking the document parser, even when the IP changes.
  Email comparison SHALL trim surrounding whitespace and ignore case, without
  provider-specific dot/plus alias rewriting.
- AC4. WHEN preparation is malformed or flooded THE SYSTEM SHALL enforce its
  own shared IP ceiling, bound metadata/body work, accept no documents there,
  and avoid unbounded email-key insertion after IP refusal.
- AC5. WHEN a caller skips preparation, changes the email after preparation,
  uses a different IP/session context, reuses an upload permission or races its
  use across two instances THE SYSTEM SHALL refuse unauthorized upload admission.
  Missing/invalid/reused/expired permissions SHALL be refused before Multer.
  The uploaded application email must match the reserved normalized email before
  any user, vendor or document write; untrusted headers or multipart field order
  SHALL NOT be sufficient proof that the email was checked.
- AC6. WHEN multiple application/preparation requests arrive concurrently on
  independent instances or instances restart THE SYSTEM SHALL share counters
  and atomically admit no more than the permitted number. All relevant limits
  SHALL be checked without race-condition overshoot.
- AC7. WHEN the shared limiter or database is unavailable THE SYSTEM SHALL fail
  closed with 503 before reading uploaded files, never fall back to an in-memory
  counter or admit uploads unchecked.
- AC8. WHEN an upload is denied before parsing THE SYSTEM SHALL neither consume
  its body through Multer nor persist document contents, users or vendors.
  Stream/chunked requests and clients that put files before metadata SHALL NOT
  bypass the gate. Rejection must not drain the upload into an application buffer.
- AC9. WHEN a limit, expired permission, validation or network failure occurs
  THE SYSTEM SHALL show a friendly inline error, retain all form values and
  selected files while the page stays open, and restore a usable send button.
  HTTP 429 SHALL display a retry time, not a technical database or proxy error.
- AC10. WHEN a logged-in owner of a rejected application reapplies within limits
  THE SYSTEM SHALL retain the existing ownership/reapplication transaction and
  create no duplicate owner. Existing pending/approved restrictions SHALL remain.
- AC11. WHEN an admin uses the existing guarded create-vendor endpoint THE
  SYSTEM SHALL preserve it without public application quotas. WHEN an admin
  attempts the public application endpoint THE SYSTEM SHALL preserve its existing
  refusal, preferably before file parsing. No new admin ability to apply is added.
- AC12. WHEN a new limiter record is stored THE SYSTEM SHALL retain only
  short-lived keyed digests and necessary counters/expiry/context, not additional
  plaintext IP/email, documents, application bodies or raw permission tokens.
  Expired enforcement state SHALL stop blocking promptly and cleanup SHALL bound
  stored state to the proposed retention during ongoing traffic.
- AC13. WHEN an untrusted client sends forwarding headers or equivalent IPv4/
  IPv6 address representations THE SYSTEM SHALL not let that alone choose a new
  IP identity. The existing production proxy boundary must be verified before
  implementation is accepted; public headers cannot arbitrarily select the key.
- AC14. WHEN the change is verified THE SYSTEM SHALL pass disposable-DEV tests
  for each boundary, simultaneous reservations and permission replay across two
  app instances, restart persistence, spoofed forwarding, email normalization,
  chunked/file-first bypass attempts, shared-store outage, cleanup, reapplication,
  admin flow, friendly errors and existing document/application regression tests.
  Tests SHALL instrument parser invocation/body reads to prove the gate is early,
  rather than merely assert the eventual HTTP status.
- AC15. WHEN the release is prepared THE SYSTEM SHALL have passed typecheck,
  build and relevant regression/migration tests, with an additive migration applied
  in DEV and no pending files. No production execution or publish by the agent.

## Constraints

| Area | Requirement |
|---|---|
| Ownership | Existing owner/session checks remain authoritative. Upload permissions bind to the checked caller, contact email and IP; request fields cannot claim another user's role or ownership. |
| Authorization | Applications stay public. No bypass for a claimed admin/vendor role. Existing admin guards, forced-password-change gate and public admin refusal remain. |
| Data and migrations | Proposed new small Postgres limiter/permission state with uniqueness/expiry indexes and concurrency-safe admission. Next free migration is currently `014_application_submission_limits.sql`, recheck at implementation. New matching schema types, no edits to applied files. No migration is created or run in this specification step. |
| Money | None. Existing booking financial snapshots, prices and fee plans unchanged. |
| Personal data | IP/email-derived enforcement keys and caller binding are pseudonymous, not anonymous. Use keyed digests with the existing SESSION_SECRET, never the insecure fallback; if unavailable, application admission fails closed. No new secret. Raw keys/tokens/identities are not logged or returned. Retention applies only to new limiter state, not original documents or application history. Secret rotation may reset limiter identities and invalidates outstanding permissions; document this. |
| Production needs | No new service, secret or setting expected. Existing production SESSION_SECRET must be present. Additive migration is deployed by the existing tracked startup runner, never hand SQL/db:push. No production access or secret modification in this work. |
| Compatibility | Existing legacy/multi-activity application payloads still validate after the new admission protocol. Current web form obtains permission automatically; direct callers of the old bare multipart API must adopt preparation and otherwise fail closed. Existing stored applications/docs/terms acceptances stay unchanged. |

## Login and waiting-list assessment

Observed on 2026-11-13:

- `server/routes.ts`: login uses a process-local Map and a combined
  `IP|email` key, ten attempts per 15 minutes. It resets per instance/restart;
  it is not an independent per-IP and per-email limit.
- `server/onboarding-routes.ts`: waiting-list signup uses a process-local Map,
  thirty attempts per IP per hour. Waiting-list deduplication prevents duplicate
  rows for an email/listing, but does not limit floods of different emails.
- Both should eventually use the same shared enforcement capability, with their
  own scopes, thresholds and tests. The new application mechanism should not
  hard-code login semantics, but this spec does not migrate those endpoints.
- Login changes affect access/security/lockout and deserve separate Madushan
  approval. Waiting-list changes need their own tested behaviour and error UX.
  Including either here expands scope without being necessary to block application
  document abuse. They remain known gaps, not claims of protection from this spec.

## Investigation and conflicts

- `server/vendor-documents.ts`: Multer memoryStorage permits 3 files of
  10 * 1024 * 1024 bytes each, one metadata field, and 4 total parts.
- `server/routes.ts`: session/auth eligibility is checked before applicationUpload;
  application JSON, document signatures and existing-account/vendor checks are
  currently after buffering. The email exists only in multipart application JSON.
- `client/src/components/vendor-application-form.tsx`: directly sends multipart
  FormData. It reads a server message but currently replaces most failures with
  generic text; limit feedback needs a focused update.
- `server/storage.ts`: existing application submission remains transactional.
  Do not change document storage or introduce orphaned uploads.
- No in-progress or awaiting-approval spec was found touching these files.
  Older specs marked approved are historical context, not newly started work.
- No conflict with the public application or private-document decisions in
  ADR 0004/007. ADR 013 governs the new migration.
- Existing admin public-form behaviour differs from a possible reading of
  "admins must still work": this spec preserves admin creation, not public
  application permission. Madushan should amend the scope explicitly if he wants
  admins to apply through the public form.
- Existing public demo-admin credentials and document access remain a separate
  known risk. This work does not change credentials or make that exposure safe.

## Open questions

For approval, not implementation assumptions:

- [ ] Does Madushan approve the proposed numerical limits, 10-minute upload
  permission, 48-hour limiter-state retention and fail-closed behaviour?
- [ ] Does Madushan confirm preserving the existing admin Create vendor flow
  and existing public admin refusal, rather than adding admin public applications?

## Notes

Madushan's supplied operational constraint: production runs on Replit autoscale
with more than one instance; process-local counters are not shared and reset.

Before this investigation, the two requested local commits were fast-forward
pushed. A fresh fetch confirmed local HEAD and origin/main both at
`e68feacbe1c68dc189657e4bac5ce5037cc6ebe4`, zero unpushed commits.

Only specification and project memory notes are added. No application code, migration, schema,
environment, secret, document or database change has been made. Design, tasks
and the decision record will follow approval, before implementation.
