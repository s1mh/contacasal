-- Create function to get couple_id from JWT app_metadata
CREATE OR REPLACE FUNCTION public.get_current_couple_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'couple_id')::uuid
$$;

-- Drop all existing SELECT policies that use USING(true)
DROP POLICY IF EXISTS "Read expenses" ON public.expenses;
DROP POLICY IF EXISTS "Read profiles for accessible couples" ON public.profiles;
DROP POLICY IF EXISTS "Read cards" ON public.cards;
DROP POLICY IF EXISTS "Read tags" ON public.tags;
DROP POLICY IF EXISTS "Read agreements" ON public.agreements;
DROP POLICY IF EXISTS "Read settlements" ON public.settlements;
DROP POLICY IF EXISTS "Allow reading couples by share_code" ON public.couples;
DROP POLICY IF EXISTS "Read expense_payments" ON public.expense_payments;

-- Drop all existing write policies
DROP POLICY IF EXISTS "Insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Delete expenses" ON public.expenses;
DROP POLICY IF EXISTS "Insert tags" ON public.tags;
DROP POLICY IF EXISTS "Delete tags" ON public.tags;
DROP POLICY IF EXISTS "Insert cards" ON public.cards;
DROP POLICY IF EXISTS "Update cards" ON public.cards;
DROP POLICY IF EXISTS "Delete cards" ON public.cards;
DROP POLICY IF EXISTS "Insert agreements" ON public.agreements;
DROP POLICY IF EXISTS "Update agreements" ON public.agreements;
DROP POLICY IF EXISTS "Delete agreements" ON public.agreements;
DROP POLICY IF EXISTS "Insert settlements" ON public.settlements;
DROP POLICY IF EXISTS "Delete settlements" ON public.settlements;
DROP POLICY IF EXISTS "Update profiles for accessible couples" ON public.profiles;
DROP POLICY IF EXISTS "Allow couple creation" ON public.couples;
DROP POLICY IF EXISTS "Insert expense_payments" ON public.expense_payments;
DROP POLICY IF EXISTS "Update expense_payments" ON public.expense_payments;
DROP POLICY IF EXISTS "Delete expense_payments" ON public.expense_payments;

-- COUPLES table: Allow reading for share_code lookup (needed for validation)
-- and allow insertion for new couples
CREATE POLICY "Allow reading couples for validation"
ON public.couples FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated couple creation"
ON public.couples FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- PROFILES table: Only read/update profiles for the authenticated couple
CREATE POLICY "Read own couple profiles"
ON public.profiles FOR SELECT
USING (couple_id = public.get_current_couple_id());

CREATE POLICY "Update own couple profiles"
ON public.profiles FOR UPDATE
USING (couple_id = public.get_current_couple_id());

-- EXPENSES table: Full CRUD for authenticated couple only
CREATE POLICY "Read own expenses"
ON public.expenses FOR SELECT
USING (couple_id = public.get_current_couple_id());

CREATE POLICY "Insert own expenses"
ON public.expenses FOR INSERT
WITH CHECK (couple_id = public.get_current_couple_id());

CREATE POLICY "Update own expenses"
ON public.expenses FOR UPDATE
USING (couple_id = public.get_current_couple_id());

CREATE POLICY "Delete own expenses"
ON public.expenses FOR DELETE
USING (couple_id = public.get_current_couple_id());

-- TAGS table: CRUD for authenticated couple only
CREATE POLICY "Read own tags"
ON public.tags FOR SELECT
USING (couple_id = public.get_current_couple_id());

CREATE POLICY "Insert own tags"
ON public.tags FOR INSERT
WITH CHECK (couple_id = public.get_current_couple_id());

CREATE POLICY "Delete own tags"
ON public.tags FOR DELETE
USING (couple_id = public.get_current_couple_id());

-- CARDS table: CRUD for authenticated couple only
CREATE POLICY "Read own cards"
ON public.cards FOR SELECT
USING (couple_id = public.get_current_couple_id());

CREATE POLICY "Insert own cards"
ON public.cards FOR INSERT
WITH CHECK (couple_id = public.get_current_couple_id());

CREATE POLICY "Update own cards"
ON public.cards FOR UPDATE
USING (couple_id = public.get_current_couple_id());

CREATE POLICY "Delete own cards"
ON public.cards FOR DELETE
USING (couple_id = public.get_current_couple_id());

-- AGREEMENTS table: CRUD for authenticated couple only
CREATE POLICY "Read own agreements"
ON public.agreements FOR SELECT
USING (couple_id = public.get_current_couple_id());

CREATE POLICY "Insert own agreements"
ON public.agreements FOR INSERT
WITH CHECK (couple_id = public.get_current_couple_id());

CREATE POLICY "Update own agreements"
ON public.agreements FOR UPDATE
USING (couple_id = public.get_current_couple_id());

CREATE POLICY "Delete own agreements"
ON public.agreements FOR DELETE
USING (couple_id = public.get_current_couple_id());

-- SETTLEMENTS table: CRUD for authenticated couple only
CREATE POLICY "Read own settlements"
ON public.settlements FOR SELECT
USING (couple_id = public.get_current_couple_id());

CREATE POLICY "Insert own settlements"
ON public.settlements FOR INSERT
WITH CHECK (couple_id = public.get_current_couple_id());

CREATE POLICY "Delete own settlements"
ON public.settlements FOR DELETE
USING (couple_id = public.get_current_couple_id());

-- EXPENSE_PAYMENTS table: Access based on expense ownership
CREATE POLICY "Read own expense_payments"
ON public.expense_payments FOR SELECT
USING (
  expense_id IN (
    SELECT id FROM public.expenses 
    WHERE couple_id = public.get_current_couple_id()
  )
);

CREATE POLICY "Insert own expense_payments"
ON public.expense_payments FOR INSERT
WITH CHECK (
  expense_id IN (
    SELECT id FROM public.expenses 
    WHERE couple_id = public.get_current_couple_id()
  )
);

CREATE POLICY "Update own expense_payments"
ON public.expense_payments FOR UPDATE
USING (
  expense_id IN (
    SELECT id FROM public.expenses 
    WHERE couple_id = public.get_current_couple_id()
  )
);

CREATE POLICY "Delete own expense_payments"
ON public.expense_payments FOR DELETE
USING (
  expense_id IN (
    SELECT id FROM public.expenses 
    WHERE couple_id = public.get_current_couple_id()
  )
);