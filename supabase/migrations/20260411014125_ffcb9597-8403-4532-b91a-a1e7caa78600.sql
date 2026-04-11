
CREATE TABLE public.weekly_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  word TEXT NOT NULL,
  category TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly suggestions"
ON public.weekly_suggestions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly suggestions"
ON public.weekly_suggestions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly suggestions"
ON public.weekly_suggestions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly suggestions"
ON public.weekly_suggestions FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_weekly_suggestions_user_week ON public.weekly_suggestions (user_id, week_start);
CREATE INDEX idx_weekly_suggestions_status ON public.weekly_suggestions (status);
