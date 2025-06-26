-- Create the league_hex table
CREATE TABLE IF NOT EXISTS league_hex (
    id BIGSERIAL PRIMARY KEY,
    league_name VARCHAR(50) NOT NULL,
    percentage DECIMAL(20,10) NOT NULL,
    all_holders INTEGER NOT NULL,
    user_holders INTEGER NOT NULL,
    last_week_holders INTEGER NOT NULL,
    holder_change INTEGER NOT NULL,
    date DATE NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_league_hex_date ON league_hex(date);
CREATE INDEX IF NOT EXISTS idx_league_hex_league_name ON league_hex(league_name);

-- Create a unique constraint to prevent duplicate entries for the same league on the same date
CREATE UNIQUE INDEX IF NOT EXISTS idx_league_hex_unique 
ON league_hex(league_name, date);

-- Add comments for documentation
COMMENT ON TABLE league_hex IS 'Daily snapshots of HEX holder league statistics';
COMMENT ON COLUMN league_hex.league_name IS 'Name of the league (e.g., Poseidon, Whale, etc.)';
COMMENT ON COLUMN league_hex.percentage IS 'Percentage threshold for the league';
COMMENT ON COLUMN league_hex.all_holders IS 'Total number of holders in this league (including contracts)';
COMMENT ON COLUMN league_hex.user_holders IS 'Number of user holders (excluding contracts) in this league';
COMMENT ON COLUMN league_hex.last_week_holders IS 'Number of holders from last week';
COMMENT ON COLUMN league_hex.holder_change IS 'Change in number of holders since last week';
COMMENT ON COLUMN league_hex.date IS 'Date of the snapshot (YYYY-MM-DD)';
COMMENT ON COLUMN league_hex.timestamp IS 'Exact timestamp when the data was collected'; 