-- Add security and recovery fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS pin_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recovery_token VARCHAR(64),
ADD COLUMN IF NOT EXISTS recovery_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Expand pin_code to store hash (64 chars for SHA-256)
ALTER TABLE public.profiles 
ALTER COLUMN pin_code TYPE VARCHAR(64);

-- Create index for recovery token lookup
CREATE INDEX IF NOT EXISTS idx_profiles_recovery_token ON public.profiles(recovery_token) WHERE recovery_token IS NOT NULL;