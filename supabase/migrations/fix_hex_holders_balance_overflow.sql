-- Fix numeric overflow in hex_holders balance field
-- Change balance from DECIMAL(30,8) to DECIMAL(50,8) to handle very large HEX balances

ALTER TABLE hex_holders 
ALTER COLUMN balance TYPE DECIMAL(50,8);

-- Add last_week_balance column if it doesn't exist
ALTER TABLE hex_holders 
ADD COLUMN IF NOT EXISTS last_week_balance DECIMAL(50,8) DEFAULT NULL;

-- If the column already exists, update its type
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hex_holders' 
        AND column_name = 'last_week_balance'
    ) THEN
        ALTER TABLE hex_holders ALTER COLUMN last_week_balance TYPE DECIMAL(50,8);
    END IF;
END $$;

-- Update comments
COMMENT ON COLUMN hex_holders.balance IS 'HEX balance (formatted with 8 decimals, supports very large values up to 10^42)';
COMMENT ON COLUMN hex_holders.last_week_balance IS 'Previous weeks HEX balance for comparison (supports very large values)'; 