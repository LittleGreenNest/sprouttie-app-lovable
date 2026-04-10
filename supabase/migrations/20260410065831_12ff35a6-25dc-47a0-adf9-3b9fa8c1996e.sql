ALTER TABLE public.daily_flashing_sessions
ALTER COLUMN activities DROP DEFAULT;

ALTER TABLE public.daily_flashing_sessions
ALTER COLUMN activities SET DATA TYPE jsonb USING to_jsonb(activities);

ALTER TABLE public.daily_flashing_sessions
ALTER COLUMN activities SET DEFAULT '[]'::jsonb;