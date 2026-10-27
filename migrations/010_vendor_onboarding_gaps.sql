-- Owner-applied to production before release. No startup migrations.
-- Production starts with demo content hidden and bookings closed.
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE experience_images ADD COLUMN IF NOT EXISTS storage_key text;
-- Preserve each legacy cover as the first gallery item without moving its file.
INSERT INTO experience_images(experience_id,image_url,sort_order)
SELECT e.id,e.image_url,0 FROM experiences e
WHERE e.image_url IS NOT NULL AND e.image_url <> ''
  AND NOT EXISTS(SELECT 1 FROM experience_images p WHERE p.experience_id=e.id);
CREATE UNIQUE INDEX IF NOT EXISTS experience_images_storage_key_idx
  ON experience_images(storage_key) WHERE storage_key IS NOT NULL;
CREATE TABLE IF NOT EXISTS site_settings (
  id integer PRIMARY KEY CHECK(id=1),
  show_demo_content boolean NOT NULL DEFAULT false,
  bookings_open boolean NOT NULL DEFAULT false,
  demo_tagged_at timestamptz
);
INSERT INTO site_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING;
-- One-time tagging only: rerunning cannot classify newly onboarded businesses.
UPDATE vendors v SET is_demo=true
FROM users u, site_settings s
WHERE u.id=v.owner_profile_id AND lower(u.email) LIKE '%@freespirit.com'
  AND s.id=1 AND s.demo_tagged_at IS NULL;
UPDATE experiences e SET is_demo=true
FROM vendors v, site_settings s
WHERE v.id=e.vendor_id AND v.is_demo AND s.id=1 AND s.demo_tagged_at IS NULL;
UPDATE site_settings SET demo_tagged_at=now() WHERE id=1 AND demo_tagged_at IS NULL;
CREATE TABLE IF NOT EXISTS waiting_list (
  id serial PRIMARY KEY,
  experience_id integer NOT NULL REFERENCES experiences(id),
  email text NOT NULL,
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(email=lower(btrim(email)))
);
CREATE UNIQUE INDEX IF NOT EXISTS waiting_list_experience_email_idx ON waiting_list(experience_id,email);
COMMIT;
