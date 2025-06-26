-- Allow null values for percentage column in league_hex table
ALTER TABLE league_hex ALTER COLUMN percentage DROP NOT NULL; 