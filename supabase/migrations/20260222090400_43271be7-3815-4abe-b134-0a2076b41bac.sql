
-- Add new onboarding fields for enhanced questionnaire
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS caregivers text NULL,
  ADD COLUMN IF NOT EXISTS pets_and_toys text NULL,
  ADD COLUMN IF NOT EXISTS daily_activities text NULL;
