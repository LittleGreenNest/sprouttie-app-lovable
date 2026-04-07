
CREATE TABLE public.weekly_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  log_type TEXT NOT NULL CHECK (log_type IN ('said', 'attempted', 'read')),
  content TEXT NOT NULL,
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly logs"
  ON public.weekly_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly logs"
  ON public.weekly_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly logs"
  ON public.weekly_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly logs"
  ON public.weekly_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
