-- Photos on the daily insight.
--
-- Motivating case: the child gets interested in an object, the parent
-- photographs it and looks up what the parts are called. That photo is the
-- insight; the words are a by-product. Today there is nowhere to put it.
--
-- Three additive changes, all idempotent:
--   1. Relax the weekly_logs.log_type CHECK, which is currently wrong.
--   2. Add weekly_logs.photo_path.
--   3. Create a private insight-photos bucket, scoped per user.

-- ---------------------------------------------------------------------------
-- 1. log_type CHECK constraint
--
-- The original constraint only permits ('said', 'attempted', 'read'), but the
-- app has been writing 'daily_insight' from the Log page since DailyInsight
-- shipped. Any such insert is rejected by Postgres, and DailyInsight only
-- console.errors on failure, so "Save Insight" fails silently.
-- 'review' is the weekly review screen.
-- ---------------------------------------------------------------------------

ALTER TABLE public.weekly_logs
  DROP CONSTRAINT IF EXISTS weekly_logs_log_type_check;

ALTER TABLE public.weekly_logs
  ADD CONSTRAINT weekly_logs_log_type_check
  CHECK (log_type IN ('said', 'attempted', 'read', 'daily_insight', 'review', 'reflection'));

-- ---------------------------------------------------------------------------
-- 2. Photo reference on the log row
--
-- Stores the storage PATH, not a public URL. The bucket is private and
-- owner-scoped, so a public URL would not resolve; readers sign the path on
-- demand. Same convention as spoken_words.video_url.
-- ---------------------------------------------------------------------------

ALTER TABLE public.weekly_logs
  ADD COLUMN IF NOT EXISTS photo_path text;

COMMENT ON COLUMN public.weekly_logs.photo_path IS
  'Storage path in the insight-photos bucket, e.g. "<user_id>/<timestamp>.jpg". Nullable. Never a full URL.';

-- ---------------------------------------------------------------------------
-- 3. Storage bucket
--
-- Private, not public. These are photographs of a child in their home, so the
-- bucket follows the tighter of the two existing patterns: access is limited
-- to objects whose first path segment is the requesting user's id.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('insight-photos', 'insight-photos', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Users can upload own insight photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'insight-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own insight photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'insight-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own insight photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'insight-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
