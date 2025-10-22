-- Extend flashcards table for progress tracking
ALTER TABLE public.flashcards
ADD COLUMN IF NOT EXISTS mastery_level integer DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 5),
ADD COLUMN IF NOT EXISTS last_reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;

-- Extend daily_tracking for better streak tracking
ALTER TABLE public.daily_tracking
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS user_local_date date;

-- Create index for faster streak queries
CREATE INDEX IF NOT EXISTS idx_daily_tracking_user_date 
ON public.daily_tracking(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_tracking_user_local_date 
ON public.daily_tracking(user_id, user_local_date DESC);

-- Extend profiles table for streak tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date date,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

-- Create function to calculate current streak
CREATE OR REPLACE FUNCTION public.calculate_streak(user_uuid uuid, user_timezone text DEFAULT 'UTC')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  streak_count integer := 0;
  check_date date;
  has_activity boolean;
BEGIN
  -- Start from today in user's timezone
  check_date := CURRENT_DATE;
  
  LOOP
    -- Check if user has any flashed activity on this date
    SELECT EXISTS (
      SELECT 1 FROM daily_tracking
      WHERE user_id = user_uuid
      AND date = check_date
      AND status = 'flashed'
    ) INTO has_activity;
    
    -- If no activity, stop counting
    IF NOT has_activity THEN
      EXIT;
    END IF;
    
    -- Increment streak and check previous day
    streak_count := streak_count + 1;
    check_date := check_date - INTERVAL '1 day';
  END LOOP;
  
  RETURN streak_count;
END;
$$;

-- Create function to update user streak
CREATE OR REPLACE FUNCTION public.update_user_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_streak integer;
BEGIN
  -- Calculate current streak
  new_streak := calculate_streak(NEW.user_id, 'UTC');
  
  -- Update profile with new streak
  UPDATE profiles
  SET 
    current_streak = new_streak,
    longest_streak = GREATEST(longest_streak, new_streak),
    last_activity_date = NEW.date
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to update streak on new tracking entry
DROP TRIGGER IF EXISTS trigger_update_streak ON public.daily_tracking;
CREATE TRIGGER trigger_update_streak
AFTER INSERT ON public.daily_tracking
FOR EACH ROW
WHEN (NEW.status = 'flashed')
EXECUTE FUNCTION public.update_user_streak();