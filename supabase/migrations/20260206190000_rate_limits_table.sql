-- Rate limiting table for edge functions
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address text NOT NULL,
  endpoint text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits (ip_address, endpoint, created_at DESC);

-- Enable RLS but create no policies (only service_role can access)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Auto-cleanup: delete entries older than 1 hour via pg_cron (if available)
-- Otherwise, cleanup is handled probabilistically in the rate-limit utility
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-rate-limits',
      '*/15 * * * *',
      'DELETE FROM public.rate_limits WHERE created_at < NOW() - INTERVAL ''1 hour'''
    );
  END IF;
END $$;
