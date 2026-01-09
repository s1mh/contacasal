-- =====================================================
-- REVAMP: Sistema Multi-Usuário com Roles
-- =====================================================

-- 1. Recriar triggers ausentes
DROP TRIGGER IF EXISTS create_profiles_on_couple_insert ON public.couples;
DROP TRIGGER IF EXISTS create_tags_on_couple_insert ON public.couples;

CREATE TRIGGER create_profiles_on_couple_insert 
  AFTER INSERT ON public.couples 
  FOR EACH ROW EXECUTE FUNCTION public.create_default_profiles();

CREATE TRIGGER create_tags_on_couple_insert 
  AFTER INSERT ON public.couples 
  FOR EACH ROW EXECUTE FUNCTION public.create_default_tags();

-- 2. Criar enum de roles
DO $$ BEGIN
  CREATE TYPE public.space_role AS ENUM ('admin', 'member');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Criar tabela de roles
CREATE TABLE IF NOT EXISTS public.space_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role space_role NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE (space_id, profile_id)
);

-- 4. Habilitar RLS na tabela space_roles
ALTER TABLE public.space_roles ENABLE ROW LEVEL SECURITY;

-- 5. Função segura para verificar role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_space_role(_profile_id uuid, _role space_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.space_roles
    WHERE profile_id = _profile_id AND role = _role
  )
$$;

-- 6. Função para obter admins de um espaço
CREATE OR REPLACE FUNCTION public.get_space_admins(_space_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT profile_id FROM public.space_roles
  WHERE space_id = _space_id AND role = 'admin'
$$;

-- 7. Função para contar membros de um espaço
CREATE OR REPLACE FUNCTION public.count_space_members(_space_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*)::integer FROM public.profiles
  WHERE couple_id = _space_id
$$;

-- 8. RLS policies para space_roles
DROP POLICY IF EXISTS "Read space roles" ON public.space_roles;
CREATE POLICY "Read space roles"
ON public.space_roles FOR SELECT
USING (space_id = get_current_couple_id());

DROP POLICY IF EXISTS "Insert space roles" ON public.space_roles;
CREATE POLICY "Insert space roles"
ON public.space_roles FOR INSERT
WITH CHECK (space_id = get_current_couple_id());

DROP POLICY IF EXISTS "Update space roles" ON public.space_roles;
CREATE POLICY "Update space roles"
ON public.space_roles FOR UPDATE
USING (space_id = get_current_couple_id());

DROP POLICY IF EXISTS "Delete space roles" ON public.space_roles;
CREATE POLICY "Delete space roles"
ON public.space_roles FOR DELETE
USING (space_id = get_current_couple_id());

-- 9. Expandir limite de pessoas de 2 para 5
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_position_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_position_check 
  CHECK (position >= 1 AND position <= 5);

-- 10. Adicionar campo max_members na tabela couples
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS max_members integer DEFAULT 5;

-- 11. Atualizar função create_default_profiles para criar apenas 1 perfil
CREATE OR REPLACE FUNCTION public.create_default_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Criar apenas 1 perfil inicial (o admin vai configurá-lo)
  INSERT INTO public.profiles (couple_id, name, color, avatar_index, position)
  VALUES (NEW.id, 'Pessoa 1', '#F5A9B8', 1, 1);
  RETURN NEW;
END;
$function$;

-- 12. Função para obter próxima posição disponível
CREATE OR REPLACE FUNCTION public.get_next_available_position(_space_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT MIN(pos) FROM generate_series(1, 5) AS pos
     WHERE pos NOT IN (SELECT position FROM public.profiles WHERE couple_id = _space_id)),
    NULL
  )
$$;

-- 13. Adicionar coluna paid_by_profile_id nas tabelas (migração de INTEGER para UUID)
-- Primeiro adicionar a nova coluna
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS paid_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.agreements ADD COLUMN IF NOT EXISTS paid_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.settlements ADD COLUMN IF NOT EXISTS paid_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.settlements ADD COLUMN IF NOT EXISTS received_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 14. Habilitar realtime para space_roles
ALTER PUBLICATION supabase_realtime ADD TABLE public.space_roles;