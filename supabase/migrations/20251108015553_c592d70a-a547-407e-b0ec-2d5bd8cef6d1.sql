-- Create pronunciations table
CREATE TABLE public.pronunciations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word_id UUID REFERENCES public.flashcards(id) ON DELETE CASCADE,
  word_text TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en', 'zh', 'yue', 'nan')),
  audio_url TEXT,
  phonetic TEXT,
  example_sentence TEXT,
  is_free BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(word_id, language)
);

-- Enable RLS
ALTER TABLE public.pronunciations ENABLE ROW LEVEL SECURITY;

-- Create policies for pronunciations
CREATE POLICY "Anyone can view pronunciations"
ON public.pronunciations
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert pronunciations"
ON public.pronunciations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update pronunciations"
ON public.pronunciations
FOR UPDATE
TO authenticated
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_pronunciations_word_id ON public.pronunciations(word_id);
CREATE INDEX idx_pronunciations_language ON public.pronunciations(language);

-- Create trigger for updated_at
CREATE TRIGGER update_pronunciations_updated_at
BEFORE UPDATE ON public.pronunciations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();