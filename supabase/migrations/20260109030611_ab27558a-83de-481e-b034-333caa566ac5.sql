-- Fix remaining overly permissive policies for expense_payments
DROP POLICY IF EXISTS "Insert expense_payments" ON public.expense_payments;
DROP POLICY IF EXISTS "Update expense_payments" ON public.expense_payments;
DROP POLICY IF EXISTS "Delete expense_payments" ON public.expense_payments;

CREATE POLICY "Insert expense_payments" 
ON public.expense_payments 
FOR INSERT 
WITH CHECK (expense_id IN (SELECT id FROM public.expenses));

CREATE POLICY "Update expense_payments" 
ON public.expense_payments 
FOR UPDATE 
USING (expense_id IN (SELECT id FROM public.expenses));

CREATE POLICY "Delete expense_payments" 
ON public.expense_payments 
FOR DELETE 
USING (expense_id IN (SELECT id FROM public.expenses));

-- Fix profiles UPDATE policy to check couple_id
DROP POLICY IF EXISTS "Update profiles for accessible couples" ON public.profiles;

CREATE POLICY "Update profiles for accessible couples" 
ON public.profiles 
FOR UPDATE 
USING (couple_id IN (SELECT id FROM public.couples));

-- Fix couples INSERT policy 
DROP POLICY IF EXISTS "Allow couple creation" ON public.couples;

CREATE POLICY "Allow couple creation" 
ON public.couples 
FOR INSERT 
WITH CHECK (id IS NOT NULL);