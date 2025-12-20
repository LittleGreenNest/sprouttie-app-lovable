-- Create table for weekly word planning
CREATE TABLE public.word_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  word TEXT NOT NULL,
  pinyin TEXT,
  theme TEXT,
  planned_week_start DATE NOT NULL,
  planned_date DATE,
  display_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.word_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own word plans" 
ON public.word_plans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own word plans" 
ON public.word_plans 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own word plans" 
ON public.word_plans 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own word plans" 
ON public.word_plans 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_word_plans_updated_at
BEFORE UPDATE ON public.word_plans
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();