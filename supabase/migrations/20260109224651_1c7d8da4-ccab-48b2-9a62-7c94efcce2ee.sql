-- Adicionar status e expiração ao profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS pending_expires_at TIMESTAMPTZ;

-- Índice para consultas de pendentes expirados
CREATE INDEX IF NOT EXISTS idx_profiles_pending_expires 
ON public.profiles (pending_expires_at) 
WHERE status = 'pending';