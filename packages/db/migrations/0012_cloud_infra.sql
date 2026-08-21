-- 0012_cloud_infra.sql — cloud infrastructure cost lines (VMs, storage,
-- networking). Ingested from Azure Cost Management CSV or AWS CUR exports.
-- Kept separate from usage_daily because Databricks system tables do not
-- carry these lines — mixing them would break the DBU-per-cost computation
-- and the SKU breakdown.
--
-- Uniqueness key uses COALESCE on nullable columns, which Postgres does not
-- accept in a PRIMARY KEY constraint but is fine in a UNIQUE INDEX.

CREATE TABLE cloud_infra_daily (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  usage_date      DATE NOT NULL,
  provider        TEXT NOT NULL CHECK (provider IN ('azure', 'aws', 'gcp')),
  service         TEXT NOT NULL,
  resource_group  TEXT,
  region          TEXT,
  cost_minor      BIGINT NOT NULL,
  cost_basis      basis NOT NULL,
  currency        CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  source          TEXT NOT NULL
);
CREATE UNIQUE INDEX cloud_infra_unique_idx
  ON cloud_infra_daily (
    tenant_id,
    usage_date,
    provider,
    service,
    COALESCE(resource_group, ''),
    COALESCE(region, '')
  );
CREATE INDEX cloud_infra_daily_date_idx
  ON cloud_infra_daily (tenant_id, usage_date);

ALTER TABLE cloud_infra_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON cloud_infra_daily
  USING (tenant_id = tare_tenant_id())
  WITH CHECK (tenant_id = tare_tenant_id());
