-- Run on DEVELOPMENT first. Madushan applies to external Neon production before release.
-- No seed code or existing price/booking totals are changed.
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_sri_lankan_resident boolean NOT NULL DEFAULT true;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS first_listing_published_at timestamptz;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS commission_override_rate numeric(5,2)
  CHECK (commission_override_rate BETWEEN 0 AND 100);
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS visitor_price_usd integer CHECK (visitor_price_usd >= 0);
ALTER TABLE experiences ALTER COLUMN currency_code SET DEFAULT 'LKR';
ALTER TABLE bookings ALTER COLUMN currency_code SET DEFAULT 'LKR';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS resident_count integer CHECK (resident_count >= 0);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS visitor_count integer CHECK (visitor_count >= 0);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS lkr_unit_price integer CHECK (lkr_unit_price >= 0);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS usd_unit_price integer CHECK (usd_unit_price >= 0);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS exchange_rate_used numeric(14,6) CHECK (exchange_rate_used > 0);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_rate_applied numeric(5,2) CHECK (commission_rate_applied BETWEEN 0 AND 100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_amount_lkr integer CHECK (commission_amount_lkr >= 0);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vendor_net_amount_lkr integer CHECK (vendor_net_amount_lkr >= 0);
CREATE TABLE IF NOT EXISTS pricing_settings (
  id serial PRIMARY KEY CHECK (id = 1),
  introductory_rate numeric(5,2) NOT NULL DEFAULT 10 CHECK (introductory_rate BETWEEN 0 AND 100),
  standard_rate numeric(5,2) NOT NULL DEFAULT 15 CHECK (standard_rate BETWEEN 0 AND 100),
  introductory_months integer NOT NULL DEFAULT 3 CHECK (introductory_months BETWEEN 0 AND 120),
  usd_to_lkr_rate numeric(14,6) CHECK (usd_to_lkr_rate > 0 AND usd_to_lkr_rate <= 1000000),
  exchange_rate_updated_at timestamptz,
  exchange_rate_updated_by integer REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
INSERT INTO pricing_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
-- Historic publication time was not recorded. Start existing live vendors' intro
-- period on migration rather than inventing a historic date.
UPDATE vendors v SET first_listing_published_at = now()
WHERE first_listing_published_at IS NULL
AND EXISTS (SELECT 1 FROM experiences e WHERE e.vendor_id = v.id AND e.status = 'published');
COMMIT;
