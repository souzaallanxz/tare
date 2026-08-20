-- 0003_auth_schema.sql — replace Phase 0 placeholder auth tables with the
-- shape Better Auth expects. camelCase columns are Better Auth's default;
-- rest of the schema stays snake_case. The bounded ugliness is worth the
-- cost of not maintaining a custom field map.

-- Drop dependents first, then placeholders. Fresh DB — safe.
DROP TABLE IF EXISTS invitation CASCADE;
DROP TABLE IF EXISTS membership CASCADE;
DROP TABLE IF EXISTS session CASCADE;
DROP TABLE IF EXISTS account CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

CREATE TABLE "user" (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL DEFAULT '',
  email           CITEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  image           TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE session (
  id           TEXT PRIMARY KEY,
  "expiresAt"  TIMESTAMPTZ NOT NULL,
  token        TEXT NOT NULL UNIQUE,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "userId"     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX session_user_idx ON session ("userId");
CREATE INDEX session_expires_idx ON session ("expiresAt");

CREATE TABLE account (
  id                       TEXT PRIMARY KEY,
  "accountId"              TEXT NOT NULL,
  "providerId"             TEXT NOT NULL,
  "userId"                 TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken"            TEXT,
  "refreshToken"           TEXT,
  "idToken"                TEXT,
  "accessTokenExpiresAt"   TIMESTAMPTZ,
  "refreshTokenExpiresAt"  TIMESTAMPTZ,
  scope                    TEXT,
  password                 TEXT,
  "createdAt"              TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("providerId", "accountId")
);
CREATE INDEX account_user_idx ON account ("userId");

CREATE TABLE verification (
  id           TEXT PRIMARY KEY,
  identifier   TEXT NOT NULL,
  value        TEXT NOT NULL,
  "expiresAt"  TIMESTAMPTZ NOT NULL,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX verification_identifier_idx ON verification (identifier);

-- Recreate tenancy tables that depended on "user".
CREATE TABLE membership (
  tenant_id  UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role       member_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);
CREATE INDEX membership_user_idx ON membership (user_id);

CREATE TABLE invitation (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  email       CITEXT NOT NULL,
  role        member_role NOT NULL,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  invited_by  TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX invitation_email_idx ON invitation (email);

-- Re-enable RLS on the recreated domain tables. Auth tables are managed by
-- Better Auth with its own connection and are intentionally left without RLS.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['membership','invitation']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$
      CREATE POLICY tenant_isolation ON %I
      USING (tenant_id = tare_tenant_id())
      WITH CHECK (tenant_id = tare_tenant_id())
    $p$, t);
  END LOOP;
END$$;
