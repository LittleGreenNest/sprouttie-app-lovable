
-- Add preferred pace column for pace adaptation
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_pace text NULL DEFAULT 'standard';
-- 'standard' = 1 new word/day, 'gentle' = 1 new word every 2 days
-- NULL or 'standard' means default pace
