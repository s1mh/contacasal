-- Drop the overly permissive policy that exposes all couples
DROP POLICY IF EXISTS "Allow reading couples for validation" ON public.couples;

-- Create a new policy that only allows users to read their own couple
CREATE POLICY "Read own couple only"
ON public.couples FOR SELECT
USING (id = public.get_current_couple_id());