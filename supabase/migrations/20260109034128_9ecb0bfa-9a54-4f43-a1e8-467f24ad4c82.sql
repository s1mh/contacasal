-- Fix the INSERT policy for couples table to allow creation
-- The current policy only checks auth.uid() IS NOT NULL which should work
-- Let's verify by looking at current policies and creating a permissive one

-- Drop existing restrictive insert policy if exists
DROP POLICY IF EXISTS "Allow authenticated couple creation" ON public.couples;

-- Create a permissive policy that allows any authenticated user to create a couple
CREATE POLICY "Allow authenticated couple creation" 
ON public.couples FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);