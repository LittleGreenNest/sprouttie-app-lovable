-- Fix missing grants on profiles table so service_role and authenticated roles
-- can read/write directly via REST API (bypasses RLS only for service_role).
-- Without these, the Stripe webhook and any admin tools get 42501 permission denied.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
