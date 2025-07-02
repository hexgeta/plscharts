-- Create table to track cron job progress
CREATE TABLE IF NOT EXISTS cron_progress (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    last_page INTEGER DEFAULT 0,
    last_address_hash VARCHAR(42),
    last_value BIGINT,
    total_collected INTEGER DEFAULT 0,
    is_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_name, date)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cron_progress_job_date ON cron_progress(job_name, date);

-- Add comments for documentation
COMMENT ON TABLE cron_progress IS 'Tracks progress of cron jobs that collect data in pages';
COMMENT ON COLUMN cron_progress.job_name IS 'Name of the cron job (e.g., hex-holders-collection)';
COMMENT ON COLUMN cron_progress.date IS 'Date when the collection started';
COMMENT ON COLUMN cron_progress.last_page IS 'Last page number successfully processed';
COMMENT ON COLUMN cron_progress.last_address_hash IS 'Address hash to resume from';
COMMENT ON COLUMN cron_progress.last_value IS 'Balance value to resume from';
COMMENT ON COLUMN cron_progress.total_collected IS 'Total number of holders collected so far';
COMMENT ON COLUMN cron_progress.is_complete IS 'Whether the collection is finished'; 