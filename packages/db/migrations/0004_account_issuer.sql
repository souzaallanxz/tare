-- 0004_account_issuer.sql — Better Auth 1.7 requires `issuer` on `account`.
-- Populated for existing rows with the synthetic "local:<providerId>" value
-- that Better Auth uses when a provider does not carry a real issuer.

ALTER TABLE account ADD COLUMN issuer TEXT;
UPDATE account SET issuer = 'local:' || "providerId" WHERE issuer IS NULL;
ALTER TABLE account ALTER COLUMN issuer SET NOT NULL;
