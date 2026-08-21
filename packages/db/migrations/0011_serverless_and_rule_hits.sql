-- 0011_serverless_and_rule_hits.sql — surface serverless flag on every
-- entity, and start capturing attribution rule hit counts over time so
-- drift is detectable (rule stops matching after a customer renames a tag).

ALTER TABLE entity ADD COLUMN serverless BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE attribution_rule_hit (
  tenant_id   UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  rule_id     UUID NOT NULL REFERENCES attribution_rule(id) ON DELETE CASCADE,
  observed_on DATE NOT NULL,
  entities    INT  NOT NULL,
  PRIMARY KEY (tenant_id, rule_id, observed_on)
);
CREATE INDEX attribution_rule_hit_time_idx
  ON attribution_rule_hit (tenant_id, observed_on DESC);
