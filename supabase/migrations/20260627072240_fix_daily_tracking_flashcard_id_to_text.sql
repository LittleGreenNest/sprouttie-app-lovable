-- flashcard_id was supposed to be changed to TEXT in 20251008020351 but
-- the live column is still UUID (confirmed by 22P02 errors on insert).
-- Force it to TEXT now, casting any existing UUID values to their text form.
ALTER TABLE public.daily_tracking
  ALTER COLUMN flashcard_id TYPE TEXT USING flashcard_id::TEXT;
