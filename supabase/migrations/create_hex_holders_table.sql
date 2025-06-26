-- Drop the table if it exists
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
CREATE INDEX IF NOT EXISTS idx_hex_holders_date ON hex_holders(date);
CREATE INDEX IF NOT EXISTS idx_hex_holders_balance ON hex_holders(balance DESC);

-- Create a unique constraint on address
ALTER TABLE hex_holders
ADD CONSTRAINT hex_holders_address_key UNIQUE (address);

-- Add comments for documentation
COMMENT ON TABLE hex_holders IS 'Daily snapshots of HEX token holders and their balances';
COMMENT ON COLUMN hex_holders.address IS 'Wallet address of the holder';
COMMENT ON COLUMN hex_holders.is_contract IS 'Whether the holder is a smart contract';
COMMENT ON COLUMN hex_holders.balance IS 'HEX balance (formatted with 8 decimals)';
COMMENT ON COLUMN hex_holders.date IS 'Date of the snapshot (YYYY-MM-DD)';
COMMENT ON COLUMN hex_holders.timestamp IS 'Exact timestamp when the data was collected';

-- Enable Row Level Security (optional, uncomment if needed)
-- ALTER TABLE hex_holders ENABLE ROW LEVEL SECURITY;

-- Create a policy for read access (optional, uncomment if needed)
-- CREATE POLICY "Allow read access to hex_holders" ON hex_holders
--     FOR SELECT USING (true); 