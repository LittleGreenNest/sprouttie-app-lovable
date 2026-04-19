-- =============================================
-- SPROUTTIE — COMPLETE SCHEMA (final state)
-- Run this once in Supabase SQL Editor on a clean database
-- =============================================

-- ENUM
DO $$ BEGIN
  CREATE TYPE public.word_stage AS ENUM ('new', 'growing', 'owned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- TABLES
-- =============================================

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  child_age_band TEXT,
  target_language TEXT,
  speech_level TEXT,
  reply_pattern TEXT,
  daily_time_commitment TEXT,
  preferred_pace TEXT,
  teaching_method TEXT,
  daily_activities TEXT,
  caregivers TEXT,
  pets_and_toys TEXT,
  timezone TEXT,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, plan, onboarding_completed)
  VALUES (NEW.id, NEW.email, 'free', false)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- flashcards
CREATE TABLE public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  card_type TEXT NOT NULL DEFAULT 'word',
  card_language TEXT NOT NULL DEFAULT 'en',
  folder TEXT,
  phrase_group TEXT,
  mastery_level INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  set_number INTEGER,
  set_display_order INTEGER,
  active_day_count INTEGER DEFAULT 0,
  card_status TEXT DEFAULT 'waiting',
  date_introduced DATE,
  date_retired DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own flashcards" ON public.flashcards FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own flashcards" ON public.flashcards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own flashcards" ON public.flashcards FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own flashcards" ON public.flashcards FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- daily_tracking
CREATE TABLE public.daily_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL,
  date TEXT NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM-DD'),
  status TEXT NOT NULL,
  flashed_by TEXT,
  flashed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  engagement INTEGER CHECK (engagement >= 1 AND engagement <= 5),
  notes TEXT,
  time_of_day TEXT,
  timezone TEXT,
  user_local_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.daily_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tracking" ON public.daily_tracking FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tracking" ON public.daily_tracking FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tracking" ON public.daily_tracking FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tracking" ON public.daily_tracking FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_daily_tracking_date_user ON public.daily_tracking(date, user_id);
CREATE INDEX IF NOT EXISTS idx_daily_tracking_user_date ON public.daily_tracking(user_id, date);

-- daily_flashing_sessions
CREATE TABLE public.daily_flashing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date TEXT NOT NULL,
  session_occurred BOOLEAN NOT NULL DEFAULT false,
  cards_introduced INTEGER,
  cards_retired INTEGER,
  books_read TEXT[],
  activities JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.daily_flashing_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sessions" ON public.daily_flashing_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.daily_flashing_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.daily_flashing_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.daily_flashing_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- spoken_words
CREATE TABLE public.spoken_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  word_stage public.word_stage NOT NULL DEFAULT 'new',
  started_saying_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  stage_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE public.spoken_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own spoken words" ON public.spoken_words FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own spoken words" ON public.spoken_words FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own spoken words" ON public.spoken_words FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own spoken words" ON public.spoken_words FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- activity_logs
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own activity logs" ON public.activity_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- audio_cache
CREATE TABLE public.audio_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash TEXT NOT NULL UNIQUE,
  text_raw TEXT NOT NULL,
  audio_path TEXT NOT NULL,
  language TEXT,
  voice TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- waitlist
CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  source TEXT,
  consent BOOLEAN DEFAULT false,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can join waitlist" ON public.waitlist FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users can view own waitlist entry" ON public.waitlist FOR SELECT TO authenticated USING (auth.email() = email);

-- lexicon
CREATE TABLE public.lexicon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  english TEXT,
  hanzi TEXT,
  poj TEXT,
  tailo TEXT,
  tone_pattern TEXT[],
  variant TEXT,
  language TEXT,
  source TEXT,
  tags TEXT[],
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.lexicon ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own lexicon" ON public.lexicon FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- pronunciations
CREATE TABLE public.pronunciations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_text TEXT NOT NULL,
  word_id UUID REFERENCES public.flashcards(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('en', 'zh', 'yue', 'nan')),
  phonetic TEXT,
  audio_url TEXT,
  example_sentence TEXT,
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  is_free BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(word_id, language)
);
ALTER TABLE public.pronunciations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read pronunciations" ON public.pronunciations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can upload pronunciations" ON public.pronunciations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update pronunciations" ON public.pronunciations FOR UPDATE TO authenticated USING (true);

-- recommended_books
CREATE TABLE public.recommended_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  age_range TEXT,
  language TEXT,
  cover_color TEXT,
  matching_words TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE public.recommended_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own recommended books" ON public.recommended_books FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recommended books" ON public.recommended_books FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own recommended books" ON public.recommended_books FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- book_feedback
CREATE TABLE public.book_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_title TEXT NOT NULL,
  book_author TEXT,
  feedback TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE public.book_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own book feedback" ON public.book_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own book feedback" ON public.book_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own book feedback" ON public.book_feedback FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own book feedback" ON public.book_feedback FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- weekly_logs
CREATE TABLE public.weekly_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start TEXT NOT NULL,
  log_type TEXT NOT NULL,
  content TEXT NOT NULL,
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE public.weekly_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own weekly logs" ON public.weekly_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weekly logs" ON public.weekly_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weekly logs" ON public.weekly_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own weekly logs" ON public.weekly_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- weekly_suggestions
CREATE TABLE public.weekly_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start TEXT NOT NULL,
  word TEXT NOT NULL,
  category TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  dismissal_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE public.weekly_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own weekly suggestions" ON public.weekly_suggestions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weekly suggestions" ON public.weekly_suggestions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weekly suggestions" ON public.weekly_suggestions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own weekly suggestions" ON public.weekly_suggestions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- word_plans
CREATE TABLE public.word_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  pinyin TEXT,
  planned_week_start TEXT NOT NULL,
  planned_date DATE,
  theme TEXT,
  notes TEXT,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE public.word_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own word plans" ON public.word_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own word plans" ON public.word_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own word plans" ON public.word_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own word plans" ON public.word_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =============================================
-- STORAGE BUCKETS
-- =============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('pronunciations', 'pronunciations', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('spoken-word-videos', 'spoken-word-videos', false) ON CONFLICT (id) DO NOTHING;

-- Pronunciation storage policies
DO $$ BEGIN CREATE POLICY "Authenticated can read pronunciations" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'pronunciations'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authenticated can upload pronunciations" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pronunciations'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authenticated can update pronunciations" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'pronunciations'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Spoken word video storage policies
DO $$ BEGIN CREATE POLICY "Users can view own spoken word videos" ON storage.objects FOR SELECT USING (bucket_id = 'spoken-word-videos' AND auth.uid()::text = (storage.foldername(name))[1]); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can upload own spoken word videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'spoken-word-videos' AND auth.uid()::text = (storage.foldername(name))[1]); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own spoken word videos" ON storage.objects FOR UPDATE USING (bucket_id = 'spoken-word-videos' AND auth.uid()::text = (storage.foldername(name))[1]); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own spoken word videos" ON storage.objects FOR DELETE USING (bucket_id = 'spoken-word-videos' AND auth.uid()::text = (storage.foldername(name))[1]); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- calculate_streak: add separately after schema is applied
