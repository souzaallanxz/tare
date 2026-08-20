-- 0006_rollup_owner_nullable.sql — actually make owner_id nullable.
-- DROP CONSTRAINT in 0005 removed the PK but left NOT NULL on the column.
ALTER TABLE rollup_daily_owner ALTER COLUMN owner_id DROP NOT NULL;
