-- Add columns to daily_tracking for individual flashcard tracking
ALTER TABLE daily_tracking 
ADD COLUMN IF NOT EXISTS flashed_by TEXT,
ADD COLUMN IF NOT EXISTS flashed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create an index for faster queries by date and user
CREATE INDEX IF NOT EXISTS idx_daily_tracking_date_user ON daily_tracking(date, user_id);

-- Add engagement and notes columns for richer tracking
ALTER TABLE daily_tracking
ADD COLUMN IF NOT EXISTS engagement INTEGER CHECK (engagement >= 1 AND engagement <= 5),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS time_of_day TEXT;