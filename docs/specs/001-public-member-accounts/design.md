# Design: Public shell and member accounts

Spec: ./spec.md

## Approach

Retain the existing pages, router, TanStack Query, shadcn primitives and session
authentication. Scope visual rules to the new shell/auth/account surfaces rather
than restyling discovery or vendor/admin content. Reuse useAuth/RequireRole.
The shared activity card may accept optional saved/remove and honest-display
props; preserve its default discovery presentation.

## Data and contract

No schema changes or migrations. Home city is localStorage-only per user/device.
POST /api/auth/change-password accepts { currentPassword, newPassword }, with
requireAuth, zod length validation and existing password hashing/comparison.
Returns { ok: true }; invalid inputs return 400, wrong current password 400,
missing/disabled session 401. No additional storage method is needed.

## Security and failures

Only res.locals.user identifies the password owner. Never accept user IDs/roles.
Restrict login next destinations to same-site absolute paths, excluding // URLs
and auth routes. Existing server route guards remain unchanged. API failures are
plain inline alerts with retry where useful; success uses existing toasts.
Browser-only storage, clipboard and native share failures are surfaced plainly.

## Verification

Typecheck/build; dev-only HTTP assertions for auth/password/validation/gates;
browser automation where available for menus, forms, redirects, account
responsive layouts and error/empty states; public screenshot verification.
No seeded data mutation or production requests.

Decision: docs/decisions/0001-member-prototype-boundaries.md.
