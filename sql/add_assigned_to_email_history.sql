-- Migration: Add ASSIGNED_TO column to EMAIL_HISTORY
-- Purpose: Store original username for audit trail while RECIPIENT_EMAIL contains resolved email
-- Date: 2026-03-18

ALTER TABLE EMAIL_HISTORY ADD COLUMN ASSIGNED_TO VARCHAR(255) NULL AFTER APP_ID;

-- Add index for faster lookups by assigned_to
CREATE INDEX idx_email_history_assigned_to ON EMAIL_HISTORY(ASSIGNED_TO);
