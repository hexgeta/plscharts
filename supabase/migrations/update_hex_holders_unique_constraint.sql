-- Drop the existing table
DROP TABLE IF EXISTS hex_holders;

-- Create the hex_holders table
CREATE TABLE IF NOT EXISTS hex_holders (
    id BIGSERIAL PRIMARY KEY,
    address VARCHAR(42) NOT NULL,
    is_contract BOOLEAN NOT NULL,
    balance DECIMAL(30,8) NOT NULL,
    date DATE NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_hex_holders_address ON hex_holders(address);
CREATE INDEX IF NOT EXISTS idx_hex_holders_date ON hex_holders(date);
CREATE INDEX IF NOT EXISTS idx_hex_holders_balance ON hex_holders(balance DESC);

-- Drop existing constraints if they exist
DROP INDEX IF EXISTS idx_hex_holders_unique;

-- Create a unique constraint on address only
ALTER TABLE hex_holders
ADD CONSTRAINT hex_holders_address_key UNIQUE (address);

-- Update existing data to keep only the latest record per address
WITH latest_holders AS (
  SELECT DISTINCT ON (address) *
  FROM hex_holders
  ORDER BY address, date DESC
)
DELETE FROM hex_holders
WHERE id NOT IN (SELECT id FROM latest_holders);

-- Add comments for documentation
COMMENT ON TABLE hex_holders IS 'Daily snapshots of HEX token holders and their balances';
COMMENT ON COLUMN hex_holders.address IS 'Wallet address of the holder';
COMMENT ON COLUMN hex_holders.is_contract IS 'Whether the holder is a smart contract';
COMMENT ON COLUMN hex_holders.balance IS 'HEX balance (formatted with 8 decimals)';
COMMENT ON COLUMN hex_holders.date IS 'Date of the snapshot (YYYY-MM-DD)';
COMMENT ON COLUMN hex_holders.timestamp IS 'Exact timestamp when the data was collected'; 