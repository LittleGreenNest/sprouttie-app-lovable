-- Drop existing SELECT policy and recreate with proper authentication check
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create new SELECT policy that requires authentication AND ownership
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Ensure unauthenticated users have no access by not granting any policies to anon role
-- The TO authenticated clause above ensures only authenticated users can access