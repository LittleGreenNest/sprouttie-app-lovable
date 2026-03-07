
-- Table to persist recommended book history (replaces localStorage)
CREATE TABLE public.recommended_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  author text,
  language text,
  age_range text,
  description text,
  cover_color text,
  matching_words text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recommended_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommended books" ON public.recommended_books
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recommended books" ON public.recommended_books
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own recommended books" ON public.recommended_books
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Table for thumbs up/down feedback on recommendations
CREATE TABLE public.book_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_title text NOT NULL,
  book_author text,
  feedback text NOT NULL CHECK (feedback IN ('up', 'down')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_title)
);

ALTER TABLE public.book_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own book feedback" ON public.book_feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own book feedback" ON public.book_feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own book feedback" ON public.book_feedback
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own book feedback" ON public.book_feedback
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_recommended_books_user ON public.recommended_books(user_id);
CREATE INDEX idx_book_feedback_user ON public.book_feedback(user_id);
