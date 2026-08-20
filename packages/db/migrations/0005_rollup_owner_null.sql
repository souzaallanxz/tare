-- 0005_rollup_owner_null.sql — allow NULL owner_id in the owner rollup.
-- Unattributed spend is a first-class value; it needs its own row per day.
-- Postgres PK columns cannot be NULL, so drop the PK and enforce uniqueness
-- via a unique index that treats NULL as a fixed sentinel.

ALTER TABLE rollup_daily_owner DROP CONSTRAINT rollup_daily_owner_pkey;

CREATE UNIQUE INDEX rollup_daily_owner_uidx
  ON rollup_daily_owner (
    tenant_id,
    usage_date,
    COALESCE(owner_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
