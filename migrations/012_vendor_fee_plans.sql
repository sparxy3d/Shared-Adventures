-- Development first. Production is owner-applied after 011.
-- No booking snapshots or existing flat overrides are rewritten.
BEGIN;
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS commission_introductory_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS commission_standard_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS commission_introductory_months integer;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendors_fee_plan_values' AND conrelid = 'vendors'::regclass) THEN
    ALTER TABLE vendors ADD CONSTRAINT vendors_fee_plan_values CHECK (
      (commission_introductory_rate IS NULL OR commission_introductory_rate BETWEEN 0 AND 100)
      AND (commission_standard_rate IS NULL OR commission_standard_rate BETWEEN 0 AND 100)
      AND (commission_introductory_months IS NULL OR commission_introductory_months BETWEEN 0 AND 120)
    );
  END IF;
END $$;
COMMIT;
