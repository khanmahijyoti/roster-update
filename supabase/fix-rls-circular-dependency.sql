-- FIX: Allow users to read their own profile
-- This fixes the circular dependency where middleware can't read role
-- Run this in Supabase SQL Editor

-- Drop the existing worker view policy
DROP POLICY IF EXISTS "Workers: View own profile" ON public.profiles;

-- Create a new policy that allows ANY authenticated user to read their own profile
-- This must come BEFORE the super_admin policy check
CREATE POLICY "Users: View own profile"
  ON public.profiles 
  FOR SELECT
  USING (id = auth.uid());

-- Verify the fix
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;
