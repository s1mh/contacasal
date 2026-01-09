-- Drop and recreate the INSERT policy to ensure it works for anonymous users
DROP POLICY IF EXISTS "Allow authenticated couple creation" ON public.couples;

-- Create a permissive policy that explicitly allows anon and authenticated roles
CREATE POLICY "Allow authenticated couple creation" 
ON public.couples FOR INSERT
TO anon, authenticated
WITH CHECK (true);