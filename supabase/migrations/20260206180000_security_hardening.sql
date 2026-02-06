-- Security hardening: Restrict couples table RLS
-- Previous policy allowed USING(true) which exposed all couple data

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Allow reading couples for validation" ON public.couples;

-- Drop and recreate to ensure idempotency
DROP POLICY IF EXISTS "Read own couple only" ON public.couples;

-- New policy: Only allow reading your own couple (via JWT couple_id)
-- Share code validation is handled by edge functions using service_role_key
CREATE POLICY "Read own couple only"
ON public.couples FOR SELECT
USING (id = public.get_current_couple_id());
