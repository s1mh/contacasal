-- Tabela de casais (espaços compartilhados)
CREATE TABLE public.couples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de perfis (2 por casal)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Pessoa',
  color TEXT NOT NULL DEFAULT '#F5A9B8',
  avatar_index INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL CHECK (position IN (1, 2)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(couple_id, position)
);

-- Tabela de tags
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'tag',
  color TEXT NOT NULL DEFAULT '#94A3B8',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de gastos
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  description TEXT,
  total_amount DECIMAL(10, 2) NOT NULL,
  paid_by INTEGER NOT NULL CHECK (paid_by IN (1, 2)),
  split_type TEXT NOT NULL CHECK (split_type IN ('equal', 'percentage', 'fixed', 'full')),
  split_value JSONB NOT NULL DEFAULT '{"person1": 50, "person2": 50}',
  tag_id UUID REFERENCES public.tags(id) ON DELETE SET NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (acesso via link compartilhado, sem autenticação)
-- Qualquer pessoa com o share_code pode acessar
CREATE POLICY "Anyone can read couples by share_code"
ON public.couples FOR SELECT
USING (true);

CREATE POLICY "Anyone can create couples"
ON public.couples FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update couples"
ON public.couples FOR UPDATE
USING (true);

-- Profiles policies
CREATE POLICY "Anyone can read profiles"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update profiles"
ON public.profiles FOR UPDATE
USING (true);

-- Tags policies
CREATE POLICY "Anyone can read tags"
ON public.tags FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert tags"
ON public.tags FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update tags"
ON public.tags FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete tags"
ON public.tags FOR DELETE
USING (true);

-- Expenses policies
CREATE POLICY "Anyone can read expenses"
ON public.expenses FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert expenses"
ON public.expenses FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update expenses"
ON public.expenses FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete expenses"
ON public.expenses FOR DELETE
USING (true);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_couples_updated_at
BEFORE UPDATE ON public.couples
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create default profiles when couple is created
CREATE OR REPLACE FUNCTION public.create_default_profiles()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (couple_id, name, color, avatar_index, position)
  VALUES 
    (NEW.id, 'Pessoa 1', '#F5A9B8', 1, 1),
    (NEW.id, 'Pessoa 2', '#A8D5BA', 2, 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_profiles_on_couple_insert
AFTER INSERT ON public.couples
FOR EACH ROW
EXECUTE FUNCTION public.create_default_profiles();

-- Function to create default tags when couple is created
CREATE OR REPLACE FUNCTION public.create_default_tags()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_tags_on_couple_insert
AFTER INSERT ON public.couples
FOR EACH ROW
EXECUTE FUNCTION public.create_default_tags();