-- Make pronunciations bucket private (prevents public listing)
-- Files remain accessible via signed URLs or via RLS-controlled SELECT policy
UPDATE storage.buckets SET public = false WHERE id = 'pronunciations';

-- Drop any overly-permissive existing policies on pronunciations bucket
DROP POLICY IF EXISTS "Public read access for pronunciations" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view pronunciations files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload pronunciations" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update pronunciations" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete pronunciations" ON storage.objects;

-- Authenticated users can read pronunciation audio files (no anonymous listing)
CREATE POLICY "Authenticated can read pronunciations"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'pronunciations');

-- Only authenticated users can upload pronunciation audio
CREATE POLICY "Authenticated can upload pronunciations"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pronunciations');

-- Only authenticated users can update pronunciation files
CREATE POLICY "Authenticated can update pronunciations"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'pronunciations');
