
-- Add child profile fields for onboarding personalization
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS child_age_band text,
  ADD COLUMN IF NOT EXISTS target_language text,
  ADD COLUMN IF NOT EXISTS speech_level text,
  ADD COLUMN IF NOT EXISTS reply_pattern text,
  ADD COLUMN IF NOT EXISTS daily_time_commitment text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
