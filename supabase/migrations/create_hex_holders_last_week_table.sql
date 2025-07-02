-- Create hex_holders_last_week table for backing up data before fresh collection
CREATE TABLE IF NOT EXISTS hex_holders_last_week (
  id BIGSERIAL PRIMARY KEY,
  address VARCHAR(42) NOT NULL,
  is_contract BOOLEAN NOT NULL DEFAULT false,
  balance NUMERIC NOT NULL,
  last_week_balance NUMERIC,
  date DATE NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hex_holders_last_week_address ON hex_holders_last_week(address);
CREATE INDEX IF NOT EXISTS idx_hex_holders_last_week_date ON hex_holders_last_week(date);
CREATE INDEX IF NOT EXISTS idx_hex_holders_last_week_balance ON hex_holders_last_week(balance DESC);

-- Add comment
COMMENT ON TABLE hex_holders_last_week IS 'Backup table for hex_holders data from the previous week, used for comparison and historical tracking'; 