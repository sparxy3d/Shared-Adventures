-- Apply after 010. DEV first; production is owner-applied. No data backfill.
BEGIN;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS application_activities jsonb;
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS typical_group_sizes text[];
COMMIT;
