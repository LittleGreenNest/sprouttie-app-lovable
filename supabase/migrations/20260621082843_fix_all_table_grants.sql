-- Fix missing table-level GRANTs for all user-data tables.
-- Root cause: Postgres 15 removed implicit PUBLIC grants that older versions provided.
-- The profiles table was fixed in 20260523000000_fix_profiles_grants.sql.
-- This migration applies the same fix to every other user-facing table.

-- Core tracking tables (the immediate trigger for this fix — daily log inserts)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_tracking TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_flashing_sessions TO authenticated;

-- Flashcard data
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcards TO authenticated;

-- Words the child is saying
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spoken_words TO authenticated;

-- Weekly word planner
GRANT SELECT, INSERT, UPDATE, DELETE ON public.word_plans TO authenticated;

-- AI word suggestions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_suggestions TO authenticated;

-- Session logs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_logs TO authenticated;

-- Activity logs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO authenticated;

-- Book recommendations + feedback
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommended_books TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_feedback TO authenticated;

-- Lexicon (shared vocabulary table)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lexicon TO authenticated;

-- Audio cache (read/write for TTS)
GRANT SELECT, INSERT, UPDATE ON public.audio_cache TO authenticated;

-- Waitlist — anon users can sign up, authenticated can read their own entry
GRANT INSERT ON public.waitlist TO anon;
GRANT SELECT ON public.waitlist TO authenticated;
