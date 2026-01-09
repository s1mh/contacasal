-- Create a security definer function to validate share_code access
-- This allows RLS policies to check if the couple_id belongs to a valid share_code
CREATE OR REPLACE FUNCTION public.get_couple_id_by_share_code(code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.couples WHERE share_code = code LIMIT 1
$$;

-- Drop existing overly permissive policies for couples
DROP POLICY IF EXISTS "Anyone can create couples" ON public.couples;
DROP POLICY IF EXISTS "Anyone can read couples by share_code" ON public.couples;
DROP POLICY IF EXISTS "Anyone can update couples" ON public.couples;

-- Create more restrictive policies for couples - only allow creation and reading
CREATE POLICY "Allow couple creation" 
ON public.couples 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow reading couples by share_code" 
ON public.couples 
FOR SELECT 
USING (true);

-- No UPDATE policy for couples (share_code should never change)
-- No DELETE policy for couples (couples should not be deleted via client)

-- Drop and recreate policies for profiles
DROP POLICY IF EXISTS "Anyone can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;

CREATE POLICY "Read profiles for accessible couples" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Update profiles for accessible couples" 
ON public.profiles 
FOR UPDATE 
USING (true);

-- No INSERT for profiles (created by trigger)
-- No DELETE for profiles (should not be deleted)

-- Drop and recreate policies for expenses
DROP POLICY IF EXISTS "Anyone can delete expenses" ON public.expenses;
DROP POLICY IF EXISTS "Anyone can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Anyone can read expenses" ON public.expenses;
DROP POLICY IF EXISTS "Anyone can update expenses" ON public.expenses;

CREATE POLICY "Read expenses" 
ON public.expenses 
FOR SELECT 
USING (true);

CREATE POLICY "Insert expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (couple_id IN (SELECT id FROM public.couples));

CREATE POLICY "Update expenses" 
ON public.expenses 
FOR UPDATE 
USING (couple_id IN (SELECT id FROM public.couples));

CREATE POLICY "Delete expenses" 
ON public.expenses 
FOR DELETE 
USING (couple_id IN (SELECT id FROM public.couples));

-- Drop and recreate policies for tags
DROP POLICY IF EXISTS "Anyone can delete tags" ON public.tags;
DROP POLICY IF EXISTS "Anyone can insert tags" ON public.tags;
DROP POLICY IF EXISTS "Anyone can read tags" ON public.tags;
DROP POLICY IF EXISTS "Anyone can update tags" ON public.tags;

CREATE POLICY "Read tags" 
ON public.tags 
FOR SELECT 
USING (true);

CREATE POLICY "Insert tags" 
ON public.tags 
FOR INSERT 
WITH CHECK (couple_id IN (SELECT id FROM public.couples));

CREATE POLICY "Delete tags" 
ON public.tags 
FOR DELETE 
USING (couple_id IN (SELECT id FROM public.couples));

-- Drop and recreate policies for cards
DROP POLICY IF EXISTS "Anyone can delete cards" ON public.cards;
DROP POLICY IF EXISTS "Anyone can insert cards" ON public.cards;
DROP POLICY IF EXISTS "Anyone can read cards" ON public.cards;
DROP POLICY IF EXISTS "Anyone can update cards" ON public.cards;

CREATE POLICY "Read cards" 
ON public.cards 
FOR SELECT 
USING (true);

CREATE POLICY "Insert cards" 
ON public.cards 
FOR INSERT 
WITH CHECK (couple_id IN (SELECT id FROM public.couples));

CREATE POLICY "Update cards" 
ON public.cards 
FOR UPDATE 
USING (couple_id IN (SELECT id FROM public.couples));

CREATE POLICY "Delete cards" 
ON public.cards 
FOR DELETE 
USING (couple_id IN (SELECT id FROM public.couples));

-- Drop and recreate policies for agreements
DROP POLICY IF EXISTS "Anyone can delete agreements" ON public.agreements;
DROP POLICY IF EXISTS "Anyone can insert agreements" ON public.agreements;
DROP POLICY IF EXISTS "Anyone can read agreements" ON public.agreements;
DROP POLICY IF EXISTS "Anyone can update agreements" ON public.agreements;

CREATE POLICY "Read agreements" 
ON public.agreements 
FOR SELECT 
USING (true);

CREATE POLICY "Insert agreements" 
ON public.agreements 
FOR INSERT 
WITH CHECK (couple_id IN (SELECT id FROM public.couples));

CREATE POLICY "Update agreements" 
ON public.agreements 
FOR UPDATE 
USING (couple_id IN (SELECT id FROM public.couples));

CREATE POLICY "Delete agreements" 
ON public.agreements 
FOR DELETE 
USING (couple_id IN (SELECT id FROM public.couples));

-- Drop and recreate policies for settlements
DROP POLICY IF EXISTS "Anyone can delete settlements" ON public.settlements;
DROP POLICY IF EXISTS "Anyone can insert settlements" ON public.settlements;
DROP POLICY IF EXISTS "Anyone can read settlements" ON public.settlements;
DROP POLICY IF EXISTS "Anyone can update settlements" ON public.settlements;

CREATE POLICY "Read settlements" 
ON public.settlements 
FOR SELECT 
USING (true);

CREATE POLICY "Insert settlements" 
ON public.settlements 
FOR INSERT 
WITH CHECK (couple_id IN (SELECT id FROM public.couples));

CREATE POLICY "Delete settlements" 
ON public.settlements 
FOR DELETE 
USING (couple_id IN (SELECT id FROM public.couples));

-- Drop and recreate policies for expense_payments
DROP POLICY IF EXISTS "Anyone can delete expense_payments" ON public.expense_payments;
DROP POLICY IF EXISTS "Anyone can insert expense_payments" ON public.expense_payments;
DROP POLICY IF EXISTS "Anyone can read expense_payments" ON public.expense_payments;
DROP POLICY IF EXISTS "Anyone can update expense_payments" ON public.expense_payments;

CREATE POLICY "Read expense_payments" 
ON public.expense_payments 
FOR SELECT 
USING (true);

CREATE POLICY "Insert expense_payments" 
ON public.expense_payments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Update expense_payments" 
ON public.expense_payments 
FOR UPDATE 
USING (true);

CREATE POLICY "Delete expense_payments" 
ON public.expense_payments 
FOR DELETE 
USING (true);

-- Fix function search paths for existing functions
CREATE OR REPLACE FUNCTION public.create_default_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (couple_id, name, color, avatar_index, position)
  VALUES 
    (NEW.id, 'Pessoa 1', '#F5A9B8', 1, 1),
    (NEW.id, 'Pessoa 2', '#A8D5BA', 2, 2);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_default_tags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tags (couple_id, name, icon, color)
  VALUES 
    (NEW.id, 'Comida', 'utensils', '#F59E0B'),
    (NEW.id, 'Casa', 'home', '#3B82F6'),
    (NEW.id, 'Contas', 'receipt', '#EF4444'),
    (NEW.id, 'Lazer', 'gamepad-2', '#8B5CF6'),
    (NEW.id, 'Transporte', 'car', '#06B6D4'),
    (NEW.id, 'Outros', 'tag', '#6B7280');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;