-- 0010_assessment_lead.sql — capture the assessment wedge inbound. No
-- tenant scope: leads exist before signup. Kept small on purpose;
-- everything richer waits for the reply thread.

CREATE TABLE assessment_lead (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             CITEXT NOT NULL,
  company           TEXT,
  workspace_host    TEXT,
  spend_band        TEXT,
  notes             TEXT,
  source            TEXT,
  ip_address        INET,
  user_agent_hash   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  contacted_at      TIMESTAMPTZ
);
CREATE INDEX assessment_lead_email_idx ON assessment_lead (email);
CREATE INDEX assessment_lead_created_idx ON assessment_lead (created_at DESC);
