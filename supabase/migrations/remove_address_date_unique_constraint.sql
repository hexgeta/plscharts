-- Remove ALL unique constraints on address to allow duplicate addresses
-- This allows for testing multiple runs on the same date and historical tracking

-- Drop all existing unique constraints on address
ALTER TABLE hex_holders DROP CONSTRAINT IF EXISTS hex_holders_address_key;
ALTER TABLE hex_holders DROP CONSTRAINT IF EXISTS hex_holders_address_date_key;
ALTER TABLE hex_holders DROP CONSTRAINT IF EXISTS hex_holders_unique_constraint;

-- Remove any unique indexes as well
DROP INDEX IF EXISTS hex_holders_address_key;
DROP INDEX IF EXISTS hex_holders_address_date_key;
DROP INDEX IF EXISTS idx_hex_holders_unique;

-- Add comment explaining the new behavior
COMMENT ON TABLE hex_holders IS 'Daily snapshots of HEX token holders - allows duplicate addresses for testing and historical tracking';

-- Keep other non-unique indexes for performance
-- Note: We intentionally do NOT create any unique constraints on address
-- The cleanup logic in calculate-leagues cron will handle duplicate removal 