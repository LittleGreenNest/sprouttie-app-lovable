-- Add set_number column to track which set (1-5) a flashcard belongs to
ALTER TABLE public.flashcards 
ADD COLUMN set_number integer DEFAULT NULL;

-- Add index for efficient set queries
CREATE INDEX idx_flashcards_set_number ON public.flashcards(user_id, set_number) WHERE set_number IS NOT NULL;