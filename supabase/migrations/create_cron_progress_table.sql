-- Create the cron_progress table for tracking batch job progress
CREATE TABLE IF NOT EXISTS cron_progress (
    id BIGSERIAL PRIMARY KEY,
    operation VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    current_page INTEGER NOT NULL DEFAULT 0,
    total_pages INTEGER NULL,
    holders_processed INTEGER NOT NULL DEFAULT 0,
    batch_size INTEGER NOT NULL DEFAULT 20,
    next_page_params JSONB NULL,
    started_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date DATE NOT NULL,
    total_holders_count INTEGER NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cron_progress_operation ON cron_progress(operation);
CREATE INDEX IF NOT EXISTS idx_cron_progress_date ON cron_progress(date);
CREATE INDEX IF NOT EXISTS idx_cron_progress_status ON cron_progress(status);

-- Create a unique constraint to prevent duplicate operations for the same date
CREATE UNIQUE INDEX IF NOT EXISTS idx_cron_progress_unique 
ON cron_progress(operation, date);

-- Add comments for documentation
COMMENT ON TABLE cron_progress IS 'Tracks progress of batch cron jobs like holder collection';
COMMENT ON COLUMN cron_progress.operation IS 'Name of the operation (e.g., hex-holders)';
COMMENT ON COLUMN cron_progress.status IS 'Current status: running, completed, or failed';
COMMENT ON COLUMN cron_progress.current_page IS 'Current page being processed';
COMMENT ON COLUMN cron_progress.total_pages IS 'Estimated total pages to process';
COMMENT ON COLUMN cron_progress.holders_processed IS 'Number of holders processed so far';
COMMENT ON COLUMN cron_progress.batch_size IS 'Number of pages processed per batch';
COMMENT ON COLUMN cron_progress.next_page_params IS 'API pagination parameters for next request';
COMMENT ON COLUMN cron_progress.date IS 'Date of the operation (YYYY-MM-DD)';
COMMENT ON COLUMN cron_progress.total_holders_count IS 'Total number of holders from API'; 