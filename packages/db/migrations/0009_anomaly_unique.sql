-- 0009_anomaly_unique.sql — one anomaly row per (tenant, entity, date,
-- direction). Re-runs of the anomaly step should be idempotent; the score
-- can drift as new points arrive so keep the freshest values.

CREATE UNIQUE INDEX IF NOT EXISTS anomaly_unique
  ON anomaly (tenant_id, entity_id, detected_on, direction);
