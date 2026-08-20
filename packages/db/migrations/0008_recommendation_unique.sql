-- 0008_recommendation_unique.sql — at most one open recommendation per
-- (rule, entity). Prevents duplicates on every re-run of the rules engine.
-- 'entity_id IS NULL' matches on the workspace-level rule (unattributed):
-- COALESCE to the zero UUID so the partial index treats it as distinct.

CREATE UNIQUE INDEX recommendation_open_uidx
  ON recommendation (
    tenant_id,
    rule,
    COALESCE(entity_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE state IN ('open', 'accepted', 'applied', 'verifying');
