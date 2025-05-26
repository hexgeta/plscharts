-- Update the total_supply_formatted column to handle larger numbers
-- Change from DECIMAL(30,8) to DECIMAL(40,8) to handle very large token supplies

ALTER TABLE daily_token_supplies 
ALTER COLUMN total_supply_formatted TYPE DECIMAL(40,8);

-- Add comment explaining the change
COMMENT ON COLUMN daily_token_supplies.total_supply_formatted IS 'Human-readable total supply (divided by 10^decimals) - supports up to 40 digits total with 8 decimal places'; 