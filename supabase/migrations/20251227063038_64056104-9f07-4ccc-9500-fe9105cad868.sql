-- Add UPDATE policy for daily_tracking table
CREATE POLICY "Users can update own tracking" 
ON public.daily_tracking 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add DELETE policy for daily_tracking table
CREATE POLICY "Users can delete own tracking" 
ON public.daily_tracking 
FOR DELETE 
USING (auth.uid() = user_id);