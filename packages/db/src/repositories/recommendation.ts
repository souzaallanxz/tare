import type { Basis } from "@tare/core";
import { assertTransition, type RecommendationState } from "@tare/core";
import type { TenantContext } from "../tenant-context.ts";

export type Recommendation = {
  id: string;
  rule: string;
  entityId: string | null;
  state: RecommendationState;
  impactMinor: number | null;
  impactBasis: Basis | null;
  currency: string;
  explanation: string;
  openedAt: string;
  appliedAt: string | null;
};

export async function createRecommendation(
  ctx: TenantContext,
  input: {
    rule: string;
    entityId: string | null;
    impactMinor: number | null;
    impactBasis: Basis | null;
    currency: string;
    explanation: string;
  },
): Promise<string> {
  const res = await ctx.query<{ id: string }>(
    `INSERT INTO recommendation
      (tenant_id, rule, entity_id, impact_minor, impact_basis, currency, explanation)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [
      ctx.tenantId,
      input.rule,
      input.entityId,
      input.impactMinor,
      input.impactBasis,
      input.currency,
      input.explanation,
    ],
  );
  const id = res.rows[0]!.id;
  await recordEvent(ctx, id, null, "open", "system", null);
  return id;
}

export async function transitionRecommendation(
  ctx: TenantContext,
  id: string,
  to: RecommendationState,
  actor: string,
  note: string | null = null,
): Promise<void> {
  const res = await ctx.query<{ state: RecommendationState }>(
    `SELECT state FROM recommendation WHERE tenant_id=$1 AND id=$2 FOR UPDATE`,
    [ctx.tenantId, id],
  );
  const row = res.rows[0];
  if (!row) throw new Error(`Recommendation ${id} not found`);
  assertTransition(row.state, to);

  await ctx.query(
    `UPDATE recommendation
     SET state = $3,
         applied_at = CASE WHEN $3 = 'applied' THEN now() ELSE applied_at END
     WHERE tenant_id=$1 AND id=$2`,
    [ctx.tenantId, id, to],
  );
  await recordEvent(ctx, id, row.state, to, actor, note);
}

async function recordEvent(
  ctx: TenantContext,
  recommendationId: string,
  from: RecommendationState | null,
  to: RecommendationState,
  actor: string,
  note: string | null,
): Promise<void> {
  await ctx.query(
    `INSERT INTO recommendation_event (recommendation_id, from_state, to_state, actor, note)
     VALUES ($1,$2,$3,$4,$5)`,
    [recommendationId, from, to, actor, note],
  );
}
