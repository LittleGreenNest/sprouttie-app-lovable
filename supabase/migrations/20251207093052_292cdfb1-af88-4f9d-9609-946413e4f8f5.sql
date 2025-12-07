-- Create activity log table to track user activities
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own activity logs" 
ON public.activity_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity logs" 
ON public.activity_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_activity_logs_user_created ON public.activity_logs(user_id, created_at DESC);