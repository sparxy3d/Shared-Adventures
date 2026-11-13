# 019 Verification

## Summary for Sudeshi

The existing application form still posts documents directly, without login,
preparation or upload tokens. Shared limits admit three attempts per IP per
rolling hour and ten per rolling 24 hours before documents are parsed. A separate
three-per-email-per-24-hours limit runs after valid parsing and before any user,
vendor or document is saved. Limit errors show a retry time; unavailable checks
return 503. Form values and chosen files remain available for manual retry.
Admins retain their existing create-vendor flow and public-form refusal, and
declined owners can still reapply. No prices, fees, login policies or waiting-list
policies changed. No production writes or publish.

## Criteria and test results

| Criterion | Verification | Result |
|---|---|---|
| AC1 | Multi-activity and legacy application regression, draft creation/prices/terms acceptance | Pass |
| AC2 | Two real HTTP apps: 8 concurrent file-first requests, only 3 parser invocations; denied request bodies not read; chunked refusal before parsing | Pass |
| AC3 | Same normalized email across distinct fixture IPs; fourth denied; users/vendors/documents counts unchanged on refusal | Pass |
| AC4 | 20 concurrent database admissions allow exactly 3; daily and hour rolling boundary checks; second store and fresh Node process see existing quota | Pass |
| AC5 | IP-stage store outage before parser; email-stage outage before writes; separate child process with missing secret returns 503 without reaching store | Pass |
| AC6 | 375/1440px browser fixtures: 429 retry time, 503 message, original field values and selected PDF File retained, manual retry only | Pass |
| AC7 | Admin public refusal before parser, guarded admin access, rejected owner updated to pending without duplicate; onboarding admin-create regression | Pass |
| AC8 | SQL contains only scope/digest/id/time; cleanup removes at most 500 old events and leaves fresh events; expired events ignored before deletion | Pass |
| AC9 | Canonical/mapped IP tests, nearest-untrusted-peer selection, spoofed headers/direct public peer tests, controlled actual DEV proxy observation and admission | Pass |
| AC10 | Typecheck/build/migration, multi-activity and onboarding suites pass; DEV 014 applied, none pending | Pass |

## Commands

- `npm run check`: pass.
- `npm run build`: pass. Existing Browserslist, PostCSS and >500KB chunk warnings remain.
- `npm run test:migrations`: pass after fixture update. Built production bundle
  applies 013/014, serves HTTP 200 against a disposable DEV schema, and refuses
  startup on checksum tampering. No production connection.
- `NODE_ENV=development npx tsx script/test-application-limits.ts`: pass.
- `NODE_ENV=development npx tsx script/test-application-restart.ts`: pass.
- `node script/test-application-feedback.cjs`: pass, 375px and 1440px.
- `NODE_ENV=development npx tsx script/verify-application-proxy.ts --observe`,
  workflow restored, then the same command without `--observe`: pass.
- `NODE_ENV=development npx tsx script/test-multi-activity-applications.ts`: pass.
- `NODE_ENV=development npx tsx script/test-onboarding.ts`: pass, including
  admin-created accounts, approval, documents and photo regressions.
- `npm run db:status`: 007, 009, 010, 011, 012, 013 and 014 applied; none pending.
- `git diff --check`: pass.

## Migration and production needs

`migrations/014_application_submission_limits.sql` adds only:

- `application_submission_attempts`: id, scope (ip/email), keyed digest,
  attempted-at timestamp.
- A scope/digest/time index and a cleanup timestamp index.
- Scope and digest-shape constraints.

It does not alter any existing table or existing application, document, user,
booking, fee or terms acceptance. Applied in DEV through the tracked startup
runner. Production will apply the packaged immutable file automatically on a
human publish; no manual SQL/db:push or new secret/service/setting.
The existing production SESSION_SECRET must be present as it already is for
sessions; no value was read or changed by the agent.

Source and `dist/migrations` SHA-256 match:

`c0a9480b96fdac633ed4eb86a8f9d73dc6a1e1330a4207c88910c331e22334bd`

## Actual proxy verification and changes

The existing one-hop Express setting saw loopback on the DEV path. An initial
comparison against an internet IP-observation service failed because requests
from this workspace reached the DEV hostname through an internal route.
No secret or raw IP was printed. An isolated listener on the same DEV ingress
independently observed the sanitized source and confirmed the edge removed the
two deliberately forged forwarding chains. After restoring the normal workflow,
its keyed observation matched the application limiter's records: first three
attempts returned validation 400, fourth returned 429 despite changing headers.
Those controlled requests contained no files and created no application records.

Application-only IP resolution walks from the socket through trusted
loopback/link-local/private proxy addresses and stops at the first untrusted
peer, rather than blindly selecting a leftmost header or trusting all headers.
Direct public socket peers cannot supply trusted forwarding identity. Replit
DEV enables the existing one-hop Express trust setting too; production's global
setting is unchanged. No login/waiting-list rate policies were migrated.

The workflow was stopped briefly for controlled proxy observations and restored.
DEV is running and serving port 5000. This proves the actual development proxy
path plus tested production-style trust rules, not instrumentation of production
request IPs; production was not changed or sent application submissions.

## Test fixture corrections and cleanup

- Express 5 exposes `app.router`, not `app._router`; the new parser instrumentation
  was corrected after its first run failed before HTTP checks.
- The multi-activity fixture creates migration 014 inside its disposable schema,
  explicitly marks its direct localhost connections as untrusted, and clears
  only its isolated admission events between independent validation cases.
  Dedicated limiter tests do not reset counters between enforcement attempts.
- The migration built-server fixture previously copied every existing public
  table except sessions/history. It now also excludes the post-baseline 014
  table, letting the bundled migration actually create it. The test asserts the
  new table exists after startup. Initial duplicate-table failure was resolved
  without adding IF NOT EXISTS or weakening the production migration.
- Database/HTTP regression data is synthetic and confined to disposable schemas,
  removed in finally blocks. The restart reader uses a separate process with the
  same isolated schema. Its missing-secret override is child-process-only, not a
  workspace/deployment secret change.
- The actual proxy probe wrote only rate-limit events in public DEV. Its final
  known-source events were removed, and the three initial loopback probe events
  were removed by exact verified ids/digest. No original user/vendor/document
  record was changed or deleted.
- Browser feedback responses were intercepted; all other non-read API calls
  were blocked. The fixture PDF and business/email inputs were never submitted.
- No real cloud storage exercised; onboarding uses its existing test object adapter.

## Files changed

Application/schema:
- `server/application-limits.ts`
- `server/storage.ts`
- `server/routes.ts`
- `shared/schema.ts`
- `client/src/components/vendor-application-form.tsx`
- `migrations/014_application_submission_limits.sql`

Tests:
- `script/test-application-limits.ts`
- `script/test-application-restart.ts`
- `script/test-application-feedback.cjs`
- `script/verify-application-proxy.ts`
- `script/test-multi-activity-applications.ts`
- `script/test-migrations.ts`

Docs/memory:
- `docs/specs/019-vendor-application-abuse-limits/{spec,design,tasks,verification}.md`
- `docs/decisions/017-application-abuse-limits.md`
- `docs/decisions/README.md`
- `docs/context/architecture.md`
- `docs/context/tech.md`
- `docs/context/profiles/node-ts.md`
- `.agents/memory/shared-request-limits.md`

No changes to seed, ENABLE_SEED, boot code, database selection, document parser/
storage/access/deletion, photo storage, login/waiting-list implementations,
dependencies, .replit or secrets.

## Evidence and limitations

- Phone screenshot of the untouched form shell checked through the running app.
- Error close-ups: `generated-artifacts/application-limits/error-375.jpg` and
  `error-1440.jpg`. These show synthetic browser fixtures, not real applicants.
- Email limiting is deliberately after buffering; malformed uploads still spend
  IP quota. Shared connections can legitimately share allowances.
- Cleanup is bounded/opportunistic during requests; while idle, old records can
  remain beyond 48 hours, but never continue counting after their window.
- Keyed digests are pseudonymous, not anonymous. Rotating SESSION_SECRET resets
  effective identities. No fallback permits unchecked uploads.
- Independent rotating IPs/emails can still attack; no global storage ceiling,
  CAPTCHA, automatic notifications or automatic quota reset is included.
- Login/waiting-list counters remain per-instance memory by explicit scope.

Ready to publish: Yes
