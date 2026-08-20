-- 0007_entity_signals.sql — attribution signals live on the entity.
-- Kept as the freshest values seen, not versioned. Historical tag reshuffling
-- is rare; when it becomes a source of confusion, promote to a dated table.

ALTER TABLE entity ADD COLUMN tags     JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE entity ADD COLUMN run_as   TEXT;
ALTER TABLE entity ADD COLUMN creator  TEXT;
