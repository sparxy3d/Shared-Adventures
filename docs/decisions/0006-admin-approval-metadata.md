# Approval age without schema changes

Record Approved at: ISO within the existing Application description block when
approving or creating a vendor. Preserve the first recorded approval timestamp
across pause/resume and profile changes.

Why: submission time is not approval time; using created_at for the seven-day
attention metric invents information. The prototype forbids schema changes.

Historical approved vendors lacking metadata have unknown approval age and are
excluded from this age-based list. Future go-live schema can replace this text
shortcut, but no migration or boot-time backfill belongs in Stage 6.
