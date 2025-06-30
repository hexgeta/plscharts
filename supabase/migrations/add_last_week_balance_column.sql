-- Add last_week_balance column to hex_holders table
ALTER TABLE hex_holders 
ADD COLUMN IF NOT EXISTS last_week_balance DECIMAL(30,8) DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN hex_holders.last_week_balance IS 'Previous weeks HEX balance for comparison';

-- Update the unique constraint to include date for historical tracking
ALTER TABLE hex_holders DROP CONSTRAINT IF EXISTS hex_holders_address_key;
ALTER TABLE hex_holders ADD CONSTRAINT hex_holders_address_date_key UNIQUE (address, date);

-- Create index for better performance on last_week_balance queries
CREATE INDEX IF NOT EXISTS idx_hex_holders_last_week_balance ON hex_holders(last_week_balance DESC); 