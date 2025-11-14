-- Add card_type column to flashcards table
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS card_type text
    NOT NULL DEFAULT 'word'
    CHECK (card_type IN ('word', 'phrase'));

-- Add phrase_group column for organizing phrases
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS phrase_group text;

-- Ensure existing rows are treated as words
UPDATE flashcards SET card_type = 'word' WHERE card_type IS NULL;

-- Add index for better filtering performance
CREATE INDEX IF NOT EXISTS idx_flashcards_card_type ON flashcards(card_type);
CREATE INDEX IF NOT EXISTS idx_flashcards_phrase_group ON flashcards(phrase_group) WHERE phrase_group IS NOT NULL;