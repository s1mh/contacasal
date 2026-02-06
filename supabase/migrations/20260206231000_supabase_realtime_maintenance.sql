-- Maintenance: Ensure Realtime tables + replica identity are consistent
-- Safe/idempotent: checks existence and ignores duplicates

DO $$
DECLARE
  tbl text;
BEGIN
  -- Tables that should be in `supabase_realtime`
  FOREACH tbl IN ARRAY ARRAY[
    'public.expenses',
    'public.profiles',
    'public.tags',
    'public.cards',
    'public.agreements',
    'public.settlements',
    'public.expense_payments',
    'public.spending_patterns',
    'public.ai_insights',
    'public.space_roles'
  ]
  LOOP
    -- Add to publication if the table exists
    IF to_regclass(tbl) IS NOT NULL THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %s', tbl);
      EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN undefined_object THEN NULL;
      END;
    END IF;

    -- Ensure replica identity full for better update/delete payloads in realtime
    IF to_regclass(tbl) IS NOT NULL THEN
      BEGIN
        EXECUTE format('ALTER TABLE %s REPLICA IDENTITY FULL', tbl);
      EXCEPTION
        WHEN undefined_table THEN NULL;
      END;
    END IF;
  END LOOP;
END $$;

