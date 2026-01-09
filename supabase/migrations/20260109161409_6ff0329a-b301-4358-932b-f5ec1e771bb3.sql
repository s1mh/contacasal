-- Add expiration to couples table for share code
ALTER TABLE public.couples 
ADD COLUMN IF NOT EXISTS share_code_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS share_code_used_at TIMESTAMP WITH TIME ZONE;

-- Delete all existing data to avoid conflicts
DELETE FROM public.expense_payments;
DELETE FROM public.expenses;
DELETE FROM public.settlements;
DELETE FROM public.agreements;
DELETE FROM public.cards;
DELETE FROM public.tags;
DELETE FROM public.profiles;
DELETE FROM public.couples;

-- Set REPLICA IDENTITY FULL for proper realtime updates (ignore errors if already set)
ALTER TABLE public.expenses REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.tags REPLICA IDENTITY FULL;
ALTER TABLE public.cards REPLICA IDENTITY FULL;
ALTER TABLE public.agreements REPLICA IDENTITY FULL;
ALTER TABLE public.settlements REPLICA IDENTITY FULL;
ALTER TABLE public.couples REPLICA IDENTITY FULL;