-- Create storage bucket for pronunciation audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('pronunciations', 'pronunciations', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for pronunciation audio files
DO $$ BEGIN
  CREATE POLICY "Anyone can view pronunciation audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pronunciations');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload pronunciation audio"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pronunciations' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can update pronunciation audio"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'pronunciations' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;