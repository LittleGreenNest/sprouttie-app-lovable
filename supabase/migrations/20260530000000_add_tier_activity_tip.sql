-- weekly_suggestions: AI-assigned learning tier (reinforce / bridge / stretch)
ALTER TABLE public.weekly_suggestions ADD COLUMN IF NOT EXISTS tier TEXT;

-- weekly_suggestions: parent-facing activity tip from AI
ALTER TABLE public.weekly_suggestions ADD COLUMN IF NOT EXISTS activity_tip TEXT;
