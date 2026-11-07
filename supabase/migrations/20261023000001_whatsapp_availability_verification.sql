-- Migration: WhatsApp Availability Verification and Filtering Support
-- Safely adds verification tracking columns and performance indexes

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_status TEXT DEFAULT 'whatsapp_unknown';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_verified_at TIMESTAMPTZ;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_verification_method TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_verified_phone TEXT;

-- Safely initialize existing records:
-- If phone is missing/empty/placeholder -> 'invalid_number'
-- If phone is present -> 'whatsapp_unknown' (truthfully unverified)
UPDATE restaurants
SET whatsapp_status = CASE
  WHEN phone_number IS NULL OR trim(phone_number) = '' OR phone_number ILIKE 'unavail%' OR phone_number ILIKE 'n/a' THEN 'invalid_number'
  ELSE 'whatsapp_unknown'
END
WHERE whatsapp_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_restaurants_whatsapp_status ON restaurants(whatsapp_status);
