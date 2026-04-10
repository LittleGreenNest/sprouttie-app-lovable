-- Add card_language column to distinguish Chinese vs English flashcards
ALTER TABLE public.flashcards 
ADD COLUMN card_language text NOT NULL DEFAULT 'zh';

-- Add index for filtering by language
CREATE INDEX idx_flashcards_card_language ON public.flashcards (card_language);