-- Add video_url column to spoken_words table
ALTER TABLE public.spoken_words 
ADD COLUMN video_url text;

-- Create storage bucket for spoken word videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('spoken-word-videos', 'spoken-word-videos', true);

-- Allow authenticated users to upload their own videos
CREATE POLICY "Users can upload own videos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'spoken-word-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view their own videos
CREATE POLICY "Users can view own videos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'spoken-word-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own videos
CREATE POLICY "Users can delete own videos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'spoken-word-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);