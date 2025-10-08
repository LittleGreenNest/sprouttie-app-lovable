-- Remove foreign key constraint and change flashcard_id to TEXT
ALTER TABLE public.daily_tracking 
DROP CONSTRAINT IF EXISTS daily_tracking_flashcard_id_fkey;

-- Change flashcard_id column type from UUID to TEXT
ALTER TABLE public.daily_tracking 
ALTER COLUMN flashcard_id TYPE TEXT;