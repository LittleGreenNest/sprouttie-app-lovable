-- Add is_ai_generated field to pronunciations table
ALTER TABLE pronunciations 
ADD COLUMN is_ai_generated boolean NOT NULL DEFAULT false;

-- Add index for filtering
CREATE INDEX idx_pronunciations_ai_generated ON pronunciations(is_ai_generated);