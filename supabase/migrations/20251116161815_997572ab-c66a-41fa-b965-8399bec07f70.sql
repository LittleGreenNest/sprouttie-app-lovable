-- Create table for tracking words the child is currently saying
CREATE TABLE public.spoken_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  word TEXT NOT NULL,
  started_saying_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.spoken_words ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own spoken words" 
ON public.spoken_words 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spoken words" 
ON public.spoken_words 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spoken words" 
ON public.spoken_words 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own spoken words" 
ON public.spoken_words 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_spoken_words_user_id ON public.spoken_words(user_id);
CREATE INDEX idx_spoken_words_started_saying_at ON public.spoken_words(started_saying_at DESC);