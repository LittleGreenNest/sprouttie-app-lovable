-- Add fields to flashcards table for schedule management
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS active_day_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS card_status TEXT DEFAULT 'waiting',
ADD COLUMN IF NOT EXISTS date_introduced DATE,
ADD COLUMN IF NOT EXISTS date_retired DATE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_flashcards_card_status ON flashcards(card_status);
CREATE INDEX IF NOT EXISTS idx_flashcards_active_day_count ON flashcards(active_day_count);

-- Create table to track daily flashing sessions
CREATE TABLE IF NOT EXISTS daily_flashing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_date DATE NOT NULL,
  session_occurred BOOLEAN NOT NULL DEFAULT false,
  cards_retired INTEGER DEFAULT 0,
  cards_introduced INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, session_date)
);

-- Enable RLS
ALTER TABLE daily_flashing_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own sessions"
ON daily_flashing_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
ON daily_flashing_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
ON daily_flashing_sessions FOR UPDATE
USING (auth.uid() = user_id);

-- Add comment for clarity
COMMENT ON COLUMN flashcards.active_day_count IS 'Number of successful flashing days (0-5)';
COMMENT ON COLUMN flashcards.card_status IS 'Card status: waiting, active, or retired';
COMMENT ON COLUMN flashcards.date_introduced IS 'Date when card became active';
COMMENT ON COLUMN flashcards.date_retired IS 'Date when card was retired after 5 active days';