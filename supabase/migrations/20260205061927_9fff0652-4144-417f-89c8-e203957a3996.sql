-- Lexicon table for Hokkien words (supports MOE dictionary lookups and AI translations)
CREATE TABLE public.lexicon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hanzi TEXT,
  tailo TEXT,
  poj TEXT,
  english TEXT,
  language TEXT DEFAULT 'hokkien',
  variant TEXT DEFAULT 'tw',
  audio_url TEXT,
  tone_pattern TEXT[],
  tags TEXT[],
  source TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lexicon ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lexicon
CREATE POLICY "Users can view own lexicon entries"
  ON public.lexicon FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own lexicon entries"
  ON public.lexicon FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lexicon entries"
  ON public.lexicon FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lexicon entries"
  ON public.lexicon FOR DELETE
  USING (auth.uid() = user_id);

-- Audio cache table for TTS (shared across users for efficiency)
CREATE TABLE public.audio_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash TEXT UNIQUE NOT NULL,
  text_raw TEXT NOT NULL,
  voice TEXT DEFAULT 'female1',
  language TEXT DEFAULT 'hokkien',
  audio_path TEXT NOT NULL,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audio_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audio_cache (public read, authenticated insert)
CREATE POLICY "Anyone can view audio cache"
  ON public.audio_cache FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert audio cache"
  ON public.audio_cache FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Add updated_at trigger for lexicon
CREATE TRIGGER update_lexicon_updated_at
  BEFORE UPDATE ON public.lexicon
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();