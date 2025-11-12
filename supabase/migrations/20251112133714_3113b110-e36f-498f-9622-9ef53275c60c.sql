-- Update the status check constraint to include 'flashed'
ALTER TABLE daily_tracking 
DROP CONSTRAINT IF EXISTS daily_tracking_status_check;

ALTER TABLE daily_tracking 
ADD CONSTRAINT daily_tracking_status_check 
CHECK (status IN ('correct', 'incorrect', 'skipped', 'flashed'));