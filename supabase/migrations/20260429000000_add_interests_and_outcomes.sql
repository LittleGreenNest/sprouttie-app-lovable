-- profiles: store child interests for autopilot theming
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS child_interests TEXT;

-- weekly_suggestions: theme from autopilot (e.g. "Transport Week")
ALTER TABLE public.weekly_suggestions ADD COLUMN IF NOT EXISTS theme TEXT;

-- weekly_suggestions: parent outcome rating (responded / partial / no_response)
ALTER TABLE public.weekly_suggestions ADD COLUMN IF NOT EXISTS outcome TEXT;

-- weekly_suggestions: timestamp when parent rated the word
ALTER TABLE public.weekly_suggestions ADD COLUMN IF NOT EXISTS outcome_noted_at TIMESTAMP WITH TIME ZONE;
