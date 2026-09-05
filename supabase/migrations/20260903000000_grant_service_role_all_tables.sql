-- Grant service_role on every user-data table.
--
-- Root cause: 20260621082843_fix_all_table_grants.sql fixed the Postgres 15
-- missing-grant problem for `authenticated` (and `anon` on one table) but never
-- granted `service_role`. Only profiles has service_role, from
-- 20260523000000_fix_profiles_grants.sql.
--
-- Symptom: the app works fine (end users are `authenticated`), but anything
-- server-side using a secret / service_role key gets
--   42501 permission denied for table <name>   [HTTP 403]
-- on every table except profiles. Verified against production 2026-09-03.
--
-- This blocks edge functions, the Stripe webhook path, admin tooling and any
-- usage/engagement reporting. RLS is unaffected: service_role bypasses RLS by
-- design, and this changes table-level GRANTs only, not policies.

-- Core tracking
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_tracking TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_flashing_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_logs TO service_role;

-- Flashcard data
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcards TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lexicon TO service_role;

-- Words the child is saying
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spoken_words TO service_role;

-- Weekly word planner and AI suggestions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.word_plans TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_suggestions TO service_role;

-- Pronunciation and audio
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pronunciations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audio_cache TO service_role;

-- Books
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommended_books TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_feedback TO service_role;

-- Waitlist
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist TO service_role;

-- Stop this recurring: make future tables in public grant service_role by default.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
