-- Migration: WhatsApp Manual Verification Workflow Support
-- Adds verified_by and verification_notes columns for audit trail of manual verifications

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_verified_by TEXT DEFAULT NULL;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_verification_notes TEXT DEFAULT NULL;
