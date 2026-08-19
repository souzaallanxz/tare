-- 0001_init.sql — foundational schema.
-- Rules encoded here rather than in application code:
--   * every fact/domain row carries tenant_id
--   * every monetary column has a sibling *_basis column (constraint checked)
--   * amounts are BIGINT minor units, never numeric/float
--   * currencies are 3-letter ISO codes, checked

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────── tenancy ───────────────────────────

CREATE TABLE tenant (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  currency    CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- Better Auth manages user/session/account. Placeholders exist so
-- foreign keys compile; the auth package will add columns as needed.
CREATE TABLE "user" (
  id             TEXT PRIMARY KEY,
  email          CITEXT UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  name           TEXT,
  image          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE session (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  expires_at   TIMESTAMPTZ NOT NULL,
  ip_address   INET,
  user_agent_hash TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX session_user_idx ON session (user_id);

CREATE TABLE account (
  id                   TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  provider_id          TEXT NOT NULL,
  account_id           TEXT NOT NULL,
  password_hash        TEXT,
  access_token_expires TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, account_id)
);

CREATE TYPE member_role AS ENUM ('owner', 'member');
CREATE TABLE membership (
  tenant_id  UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role       member_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);
CREATE INDEX membership_user_idx ON membership (user_id);

CREATE TABLE invitation (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  email      CITEXT NOT NULL,
  role       member_role NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────── workspace connection ──────────────────
-- Secret is stored as an envelope-encrypted blob referenced by secret_ref.
CREATE TYPE connection_status AS ENUM ('pending', 'ok', 'auth_failed', 'permission', 'schema_drift', 'quota', 'error');

CREATE TABLE workspace_connection (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  host           TEXT NOT NULL,
  client_id      TEXT NOT NULL,
  secret_ref     UUID NOT NULL,           -- FK to secret_material below
  warehouse_id   TEXT,
  status         connection_status NOT NULL DEFAULT 'pending',
  status_message TEXT,
  last_ok_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, host)
);

CREATE TABLE secret_material (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  purpose     TEXT NOT NULL,              -- e.g. 'workspace_connection'
  sealed      BYTEA NOT NULL,             -- serialize(seal(secret, kek))
  kek_version SMALLINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at  TIMESTAMPTZ
);
ALTER TABLE workspace_connection
  ADD CONSTRAINT workspace_connection_secret_fk
  FOREIGN KEY (secret_ref) REFERENCES secret_material(id);

-- ────────────────────────── ingest runs ────────────────────────
CREATE TYPE ingest_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'partial');

CREATE TABLE ingest_run (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  connection_id  UUID REFERENCES workspace_connection(id) ON DELETE SET NULL,
  source         TEXT NOT NULL,           -- 'databricks' | 'csv_import'
  window_start   DATE NOT NULL,
  window_end     DATE NOT NULL,
  status         ingest_status NOT NULL DEFAULT 'queued',
  rows_read      BIGINT NOT NULL DEFAULT 0,
  rows_upserted  BIGINT NOT NULL DEFAULT 0,
  started_at     TIMESTAMPTZ,
  finished_at    TIMESTAMPTZ,
  error_class    TEXT,
  error_message  TEXT,
  lease_expires_at TIMESTAMPTZ,
  attempts       INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ingest_run_tenant_idx ON ingest_run (tenant_id, created_at DESC);
CREATE INDEX ingest_run_lease_idx  ON ingest_run (status, lease_expires_at)
  WHERE status IN ('queued', 'running');

-- ───────────────────────── dimensions ──────────────────────────
CREATE TYPE entity_kind AS ENUM ('job', 'cluster', 'warehouse', 'pipeline', 'notebook');

CREATE TABLE entity (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  kind         entity_kind NOT NULL,
  external_id  TEXT NOT NULL,
  name         TEXT NOT NULL,
  first_seen   DATE NOT NULL,
  last_seen    DATE NOT NULL,
  UNIQUE (tenant_id, kind, external_id)
);
CREATE INDEX entity_tenant_idx ON entity (tenant_id, kind);

CREATE TABLE owner (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('team', 'person')),
  UNIQUE (tenant_id, name)
);

CREATE TABLE attribution_rule (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  priority   INT NOT NULL,
  matcher    JSONB NOT NULL,              -- { type: 'tag', key: 'team', value: 'platform' }
  owner_id   UUID NOT NULL REFERENCES owner(id) ON DELETE CASCADE,
  active     BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (tenant_id, priority)
);

CREATE TYPE attribution_source AS ENUM ('tag', 'run_as', 'creator', 'query_user', 'manual', 'warehouse_id');

CREATE TABLE entity_owner (
  tenant_id    UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  entity_id    UUID NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  owner_id     UUID REFERENCES owner(id) ON DELETE SET NULL,
  source       attribution_source,
  resolved_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, entity_id)
);

CREATE TABLE rate_card (
  tenant_id      UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  sku            TEXT NOT NULL,
  rate_minor     BIGINT NOT NULL CHECK (rate_minor >= 0),
  currency       CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  effective_from DATE NOT NULL,
  PRIMARY KEY (tenant_id, sku, effective_from)
);

-- ─────────────────────────── facts ─────────────────────────────
CREATE TYPE basis AS ENUM ('billed', 'estimated');

CREATE TABLE usage_daily (
  tenant_id        UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  usage_date       DATE NOT NULL,
  entity_id        UUID NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  sku              TEXT NOT NULL,
  dbus             NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (dbus >= 0),
  cost_minor       BIGINT NOT NULL CHECK (cost_minor >= 0),
  cost_basis       basis NOT NULL,
  list_cost_minor  BIGINT NOT NULL CHECK (list_cost_minor >= 0),
  currency         CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  ingested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ingest_run_id    UUID REFERENCES ingest_run(id) ON DELETE SET NULL,
  PRIMARY KEY (tenant_id, usage_date, entity_id, sku)
);
CREATE INDEX usage_daily_entity_idx ON usage_daily (tenant_id, entity_id, usage_date);
CREATE INDEX usage_daily_date_idx   ON usage_daily (tenant_id, usage_date);

-- Pre-aggregated rollups: recomputed for touched dates after ingestion.
CREATE TABLE rollup_daily_owner (
  tenant_id   UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  usage_date  DATE NOT NULL,
  owner_id    UUID REFERENCES owner(id) ON DELETE CASCADE,  -- NULL = unattributed
  cost_minor  BIGINT NOT NULL,
  cost_basis  basis NOT NULL,
  currency    CHAR(3) NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, usage_date, owner_id)
);

CREATE TABLE rollup_daily_workspace (
  tenant_id   UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  usage_date  DATE NOT NULL,
  cost_minor  BIGINT NOT NULL,
  cost_basis  basis NOT NULL,
  currency    CHAR(3) NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, usage_date)
);

-- Cluster/warehouse config history — versioned by observed_on, never destructive.
CREATE TABLE entity_config_daily (
  tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  entity_id       UUID NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  observed_on     DATE NOT NULL,
  node_type       TEXT,
  min_workers     INT,
  max_workers     INT,
  autotermination_minutes INT,
  runtime_version TEXT,
  tags            JSONB,
  raw             JSONB,
  PRIMARY KEY (tenant_id, entity_id, observed_on)
);

-- ─────────────────────── derived state ─────────────────────────
-- Recommendations, savings, budgets. Never deleted — history is the product.
CREATE TYPE recommendation_state AS ENUM
  ('open', 'accepted', 'applied', 'verifying', 'confirmed', 'not_observed');

CREATE TABLE recommendation (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  rule           TEXT NOT NULL,
  entity_id      UUID REFERENCES entity(id) ON DELETE SET NULL,
  opened_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  state          recommendation_state NOT NULL DEFAULT 'open',
  impact_minor   BIGINT,
  impact_basis   basis,
  currency       CHAR(3) NOT NULL,
  explanation    TEXT NOT NULL,
  applied_at     TIMESTAMPTZ,
  CONSTRAINT impact_basis_paired
    CHECK ((impact_minor IS NULL) = (impact_basis IS NULL))
);
CREATE INDEX rec_tenant_state_idx ON recommendation (tenant_id, state, opened_at DESC);

CREATE TABLE recommendation_event (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES recommendation(id) ON DELETE CASCADE,
  at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  from_state        recommendation_state,
  to_state          recommendation_state NOT NULL,
  actor             TEXT,
  note              TEXT
);

CREATE TABLE saving (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  recommendation_id UUID NOT NULL REFERENCES recommendation(id) ON DELETE CASCADE,
  confirmed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount_minor      BIGINT NOT NULL,
  basis             basis NOT NULL DEFAULT 'billed',
  currency          CHAR(3) NOT NULL,
  window_start      DATE NOT NULL,
  window_end        DATE NOT NULL,
  method            TEXT NOT NULL             -- e.g. '28d_paired_baseline'
);
CREATE INDEX saving_tenant_idx ON saving (tenant_id, confirmed_at DESC);

CREATE TABLE budget (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  scope         JSONB NOT NULL,             -- { type: 'workspace' } | { type: 'owner', ownerId }
  period        TEXT NOT NULL CHECK (period IN ('monthly', 'quarterly')),
  limit_minor   BIGINT NOT NULL CHECK (limit_minor > 0),
  threshold_pct INT NOT NULL CHECK (threshold_pct BETWEEN 1 AND 100),
  currency      CHAR(3) NOT NULL
);

CREATE TABLE anomaly (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  entity_id     UUID REFERENCES entity(id) ON DELETE CASCADE,
  detected_on   DATE NOT NULL,
  direction     TEXT NOT NULL CHECK (direction IN ('up', 'down')),
  score         NUMERIC(6,2) NOT NULL,
  baseline_median_minor BIGINT NOT NULL,
  observed_minor        BIGINT NOT NULL,
  currency      CHAR(3) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE report_run (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  period       TEXT NOT NULL,               -- 'weekly:2026-W34'
  sent_at      TIMESTAMPTZ,
  recipients   JSONB NOT NULL,
  payload      JSONB NOT NULL,
  UNIQUE (tenant_id, period)
);

CREATE TABLE report_recipient (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  email      CITEXT NOT NULL,
  name       TEXT,
  cadence    TEXT NOT NULL CHECK (cadence IN ('weekly', 'monthly')),
  active     BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (tenant_id, email, cadence)
);
