-- Add teaching method preference to profiles
ALTER TABLE public.profiles 
ADD COLUMN teaching_method TEXT DEFAULT 'balanced';

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.teaching_method IS 'Teaching method preference: whole_word_flash, right_brain_speed, or balanced';