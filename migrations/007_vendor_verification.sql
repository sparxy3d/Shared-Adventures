-- External Neon: apply manually before deploying compatible code.
-- Agent applies this to DEVELOPMENT ONLY. Madushan applies it to production.
BEGIN;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS taking_bookings boolean NOT NULL DEFAULT true;
CREATE TABLE IF NOT EXISTS vendor_documents (
  id serial PRIMARY KEY,
  vendor_id integer NOT NULL REFERENCES vendors(id),
  kind text NOT NULL CHECK (kind IN ('idCopy', 'policeReport', 'businessRegistration')),
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  contents bytea,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by integer REFERENCES users(id),
  CHECK (
    (contents IS NOT NULL AND octet_length(contents) = size_bytes AND deleted_at IS NULL AND deleted_by IS NULL)
    OR (contents IS NULL AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS vendor_documents_vendor_id_idx ON vendor_documents(vendor_id);
COMMIT;
