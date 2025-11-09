-- Create storage bucket for pronunciation audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('pronunciations', 'pronunciations', true);

-- RLS policies for pronunciation audio files
CREATE POLICY "Anyone can view pronunciation audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'pronunciations');

CREATE POLICY "Authenticated users can upload pronunciation audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pronunciations' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update pronunciation audio"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pronunciations' AND auth.role() = 'authenticated');