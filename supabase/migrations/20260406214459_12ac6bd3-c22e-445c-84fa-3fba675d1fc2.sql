
-- Make spoken-word-videos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'spoken-word-videos';

-- Add RLS policies for private access (owner-only via user_id folder structure)
CREATE POLICY "Users can view own spoken word videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'spoken-word-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own spoken word videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'spoken-word-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own spoken word videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'spoken-word-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own spoken word videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'spoken-word-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
