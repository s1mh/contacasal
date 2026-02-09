-- Maintenance: Standardize RLS policy names (no permission logic change)
-- Safe/idempotent: renames only if old policy exists and new doesn't

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT *
    FROM (
      VALUES
        -- spending_patterns
        ('public', 'spending_patterns', 'Users can view own spending patterns', 'Read own spending_patterns'),
        ('public', 'spending_patterns', 'Users can insert own spending patterns', 'Insert own spending_patterns'),
        ('public', 'spending_patterns', 'Users can update own spending patterns', 'Update own spending_patterns'),
        ('public', 'spending_patterns', 'Users can delete own spending patterns', 'Delete own spending_patterns'),

        -- ai_insights
        ('public', 'ai_insights', 'Users can view own insights', 'Read own ai_insights'),
        ('public', 'ai_insights', 'Users can insert own insights', 'Insert own ai_insights'),
        ('public', 'ai_insights', 'Users can update own insights', 'Update own ai_insights'),
        ('public', 'ai_insights', 'Users can delete own insights', 'Delete own ai_insights'),

        -- space_roles
        ('public', 'space_roles', 'Read space roles', 'Read own space_roles'),
        ('public', 'space_roles', 'Insert space roles', 'Insert own space_roles'),
        ('public', 'space_roles', 'Update space roles', 'Update own space_roles'),
        ('public', 'space_roles', 'Delete space roles', 'Delete own space_roles')
    ) AS v(schemaname, tablename, oldname, newname)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = r.schemaname
        AND p.tablename = r.tablename
        AND p.policyname = r.oldname
    ) AND NOT EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = r.schemaname
        AND p.tablename = r.tablename
        AND p.policyname = r.newname
    ) THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I RENAME TO %I',
        r.oldname,
        r.schemaname,
        r.tablename,
        r.newname
      );
    END IF;
  END LOOP;
END $$;

