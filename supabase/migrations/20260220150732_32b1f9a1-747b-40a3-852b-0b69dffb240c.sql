
-- Create the word_stage enum type
DO $$ BEGIN
  CREATE TYPE public.word_stage AS ENUM ('new', 'growing', 'owned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add word_stage column to spoken_words
ALTER TABLE public.spoken_words
  ADD COLUMN IF NOT EXISTS word_stage public.word_stage NOT NULL DEFAULT 'new';

-- Add stage_updated_at column to spoken_words
ALTER TABLE public.spoken_words
  ADD COLUMN IF NOT EXISTS stage_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
