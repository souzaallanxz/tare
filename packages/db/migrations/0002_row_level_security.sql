-- 0002_row_level_security.sql — second line of defence.
-- The primary line is the repository layer (queries refuse to run without a
-- tenant context). RLS is the safety net for the day someone writes a query
-- and forgets. Enabled here in permissive mode; enforcement lands with paying
-- customers, when we can safely burn a rotation on failures.

-- Every request sets:  SELECT set_config('tare.tenant_id', <uuid>, true);
-- Policies compare against current_setting('tare.tenant_id', true).

CREATE OR REPLACE FUNCTION tare_tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('tare.tenant_id', true), '')::uuid
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'workspace_connection','secret_material','ingest_run',
    'entity','owner','attribution_rule','entity_owner','rate_card',
    'usage_daily','rollup_daily_owner','rollup_daily_workspace',
    'entity_config_daily','recommendation','saving','budget','anomaly',
    'report_run','report_recipient','membership','invitation'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$
      CREATE POLICY tenant_isolation ON %I
      USING (tenant_id = tare_tenant_id())
      WITH CHECK (tenant_id = tare_tenant_id())
    $p$, t);
  END LOOP;
END$$;
