-- weekly_suggestions: which flashcard set this word is suggested for
ALTER TABLE public.weekly_suggestions ADD COLUMN IF NOT EXISTS set_number INTEGER;
