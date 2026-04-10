-- Add books_read and activities columns to daily_flashing_sessions
ALTER TABLE public.daily_flashing_sessions
ADD COLUMN books_read text[] DEFAULT '{}',
ADD COLUMN activities text[] DEFAULT '{}';