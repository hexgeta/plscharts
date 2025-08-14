-- Create the pls_api_data table for daily PLS USDT/USDC/DAI pool data
CREATE TABLE IF NOT EXISTS pls_api_data (
    id BIGSERIAL PRIMARY KEY,
    pool_address VARCHAR(42) NOT NULL,
    chain_id INTEGER NOT NULL DEFAULT 369,
    virtual_price_raw TEXT NOT NULL, -- Store as text to handle very large numbers
    virtual_price_formatted DECIMAL(30,18) NOT NULL, -- Formatted decimal version with high precision
    contract_address VARCHAR(42) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pls_api_data_pool_address ON pls_api_data(pool_address);
CREATE INDEX IF NOT EXISTS idx_pls_api_data_date ON pls_api_data(date);
CREATE INDEX IF NOT EXISTS idx_pls_api_data_chain_id ON pls_api_data(chain_id);
CREATE INDEX IF NOT EXISTS idx_pls_api_data_contract_address ON pls_api_data(contract_address);
CREATE INDEX IF NOT EXISTS idx_pls_api_data_pool_date ON pls_api_data(pool_address, date);

-- Create a unique constraint to prevent duplicate entries for the same pool on the same date
CREATE UNIQUE INDEX IF NOT EXISTS idx_pls_api_data_unique 
ON pls_api_data(pool_address, chain_id, date);

-- Add comments for documentation
COMMENT ON TABLE pls_api_data IS 'Daily snapshots of PLS USDT/USDC/DAI stable pool virtual price data';
COMMENT ON COLUMN pls_api_data.pool_address IS 'Pool contract address (0xE3acFA6C40d53C3faf2aa62D0a715C737071511c)';
COMMENT ON COLUMN pls_api_data.chain_id IS 'Blockchain ID (369 for PulseChain)';
COMMENT ON COLUMN pls_api_data.virtual_price_raw IS 'Raw virtual price as string from get_virtual_price() function';
COMMENT ON COLUMN pls_api_data.virtual_price_formatted IS 'Human-readable virtual price (divided by 10^18)';
COMMENT ON COLUMN pls_api_data.contract_address IS 'Contract address used for the call (same as pool_address)';
COMMENT ON COLUMN pls_api_data.timestamp IS 'Exact time when the data was collected';
COMMENT ON COLUMN pls_api_data.date IS 'Date in YYYY-MM-DD format';
