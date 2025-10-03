-- Create waitlist table for Pro Plan signups
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  source TEXT,
  consent BOOLEAN DEFAULT false,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for waitlist signups)
CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Only allow users to see their own waitlist entries
CREATE POLICY "Users can view own waitlist entry"
  ON public.waitlist
  FOR SELECT
  TO authenticated
  USING (auth.email() = email);