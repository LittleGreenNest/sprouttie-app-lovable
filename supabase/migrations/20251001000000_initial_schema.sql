-- =============================================
-- INITIAL SCHEMA — creates all base tables
-- =============================================

-- Enum
DO $$ BEGIN
  CREATE TYPE public.word_stage AS ENUM ('new', 'growing', 'owned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
  subscription_status TEXT
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

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
CREATE TABLE IF NOT EXISTS public.flashcards (
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
CREATE POLICY "Users can manage own flashcards" ON public.flashcards FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- daily_tracking
CREATE TABLE IF NOT EXISTS public.daily_tracking (
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
CREATE POLICY "Users can manage own daily tracking" ON public.daily_tracking FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_daily_tracking_date_user ON public.daily_tracking(date, user_id);

-- daily_flashing_sessions
CREATE TABLE IF NOT EXISTS public.daily_flashing_sessions (
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
CREATE POLICY "Users can manage own sessions" ON public.daily_flashing_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- spoken_words created by migration 20251116161815

-- activity_logs created by migration 20251207093052

-- audio_cache
CREATE TABLE IF NOT EXISTS public.audio_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash TEXT NOT NULL UNIQUE,
  text_raw TEXT NOT NULL,
  audio_path TEXT NOT NULL,
  language TEXT,
  voice TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- book_feedback created by migration 20260307075015

-- lexicon
CREATE TABLE IF NOT EXISTS public.lexicon (
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

-- pronunciations created by migration 20251108015553
-- recommended_books created by migration 20260307075015

-- waitlist is created by migration 20251003035937

-- weekly_logs created by migration 20260407144453
-- weekly_suggestions created by migration 20260411014125

-- word_plans created by migration 20251220130526

-- calculate_streak function
CREATE OR REPLACE FUNCTION public.calculate_streak(user_uuid UUID, user_timezone TEXT DEFAULT 'UTC')
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER := 0;
  current_date_local DATE;
  check_date DATE;
  session_exists BOOLEAN;
BEGIN
  current_date_local := (NOW() AT TIME ZONE user_timezone)::DATE;
  check_date := current_date_local;
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.daily_flashing_sessions
      WHERE user_id = user_uuid
        AND session_date = to_char(check_date, 'YYYY-MM-DD')
        AND session_occurred = true
    ) INTO session_exists;
    EXIT WHEN NOT session_exists;
    streak := streak + 1;
    check_date := check_date - INTERVAL '1 day';
  END LOOP;
  RETURN streak;
END;
$$ LANGUAGE plpgsql;
