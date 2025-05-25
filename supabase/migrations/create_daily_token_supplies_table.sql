-- Create the daily_token_supplies table
CREATE TABLE IF NOT EXISTS daily_token_supplies (
    id BIGSERIAL PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL,
    chain INTEGER NOT NULL,
    address VARCHAR(42) NOT NULL,
    name TEXT NOT NULL,
    decimals INTEGER NOT NULL,
    total_supply TEXT NOT NULL, -- Store as text to handle very large numbers
    total_supply_formatted DECIMAL(30,8) NOT NULL, -- Formatted decimal version
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_token_supplies_ticker ON daily_token_supplies(ticker);
CREATE INDEX IF NOT EXISTS idx_daily_token_supplies_date ON daily_token_supplies(date);
CREATE INDEX IF NOT EXISTS idx_daily_token_supplies_chain ON daily_token_supplies(chain);
CREATE INDEX IF NOT EXISTS idx_daily_token_supplies_address ON daily_token_supplies(address);
CREATE INDEX IF NOT EXISTS idx_daily_token_supplies_ticker_date ON daily_token_supplies(ticker, date);

-- Create a unique constraint to prevent duplicate entries for the same token on the same date
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_token_supplies_unique 
ON daily_token_supplies(ticker, chain, address, date);

-- Add comments for documentation
COMMENT ON TABLE daily_token_supplies IS 'Daily snapshots of token total supplies for all tokens in TOKEN_CONSTANTS';
COMMENT ON COLUMN daily_token_supplies.ticker IS 'Token ticker symbol (e.g., PLS, HEX, MAXI)';
COMMENT ON COLUMN daily_token_supplies.chain IS 'Blockchain ID (1 for Ethereum, 369 for PulseChain)';
COMMENT ON COLUMN daily_token_supplies.address IS 'Token contract address';
COMMENT ON COLUMN daily_token_supplies.name IS 'Full token name';
COMMENT ON COLUMN daily_token_supplies.decimals IS 'Number of decimal places for the token';
COMMENT ON COLUMN daily_token_supplies.total_supply IS 'Raw total supply as string (handles very large numbers)';
COMMENT ON COLUMN daily_token_supplies.total_supply_formatted IS 'Human-readable total supply (divided by 10^decimals)';
COMMENT ON COLUMN daily_token_supplies.timestamp IS 'Exact timestamp when the data was collected';
COMMENT ON COLUMN daily_token_supplies.date IS 'Date of the snapshot (YYYY-MM-DD)';

-- Enable Row Level Security (optional, uncomment if needed)
-- ALTER TABLE daily_token_supplies ENABLE ROW LEVEL SECURITY;

-- Create a policy for read access (optional, uncomment if needed)
-- CREATE POLICY "Allow read access to daily_token_supplies" ON daily_token_supplies
--     FOR SELECT USING (true); 