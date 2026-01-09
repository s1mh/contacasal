-- 1. Nova tabela de cartões
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  closing_day INTEGER CHECK (closing_day >= 1 AND closing_day <= 31),
  due_day INTEGER CHECK (due_day >= 1 AND due_day <= 31),
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para cards
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cards" ON public.cards FOR SELECT USING (true);
CREATE POLICY "Anyone can insert cards" ON public.cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update cards" ON public.cards FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete cards" ON public.cards FOR DELETE USING (true);

-- 2. Atualizar tabela expenses com novos campos
ALTER TABLE public.expenses 
  ADD COLUMN payment_type TEXT DEFAULT 'debit' CHECK (payment_type IN ('debit', 'credit')),
  ADD COLUMN card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  ADD COLUMN billing_month DATE,
  ADD COLUMN installments INTEGER DEFAULT 1,
  ADD COLUMN installment_number INTEGER DEFAULT 1;

-- 3. Nova tabela de acordos recorrentes
CREATE TABLE public.agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  split_type TEXT NOT NULL,
  split_value JSONB NOT NULL DEFAULT '{"person1": 50, "person2": 50}'::jsonb,
  paid_by INTEGER NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE SET NULL,
  day_of_month INTEGER DEFAULT 1 CHECK (day_of_month >= 1 AND day_of_month <= 31),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para agreements
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read agreements" ON public.agreements FOR SELECT USING (true);
CREATE POLICY "Anyone can insert agreements" ON public.agreements FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update agreements" ON public.agreements FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete agreements" ON public.agreements FOR DELETE USING (true);

-- 4. Nova tabela de acertos de contas
CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  paid_by INTEGER NOT NULL,
  settled_at TIMESTAMPTZ DEFAULT now(),
  note TEXT
);

-- RLS para settlements
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settlements" ON public.settlements FOR SELECT USING (true);
CREATE POLICY "Anyone can insert settlements" ON public.settlements FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update settlements" ON public.settlements FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete settlements" ON public.settlements FOR DELETE USING (true);

-- 5. Nova tabela para pagamentos múltiplos (split por cartão)
CREATE TABLE public.expense_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_type TEXT DEFAULT 'debit' CHECK (payment_type IN ('debit', 'credit')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para expense_payments
ALTER TABLE public.expense_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read expense_payments" ON public.expense_payments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert expense_payments" ON public.expense_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update expense_payments" ON public.expense_payments FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete expense_payments" ON public.expense_payments FOR DELETE USING (true);

-- 6. Habilitar realtime para as novas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agreements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settlements;