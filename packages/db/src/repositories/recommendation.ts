import type { Basis } from "@tare/core";
import { assertTransition, type RecommendationState } from "@tare/core";
import type { TenantContext } from "../tenant-context.ts";

export type RecommendationRow = {
  id: string;
  rule: string;
  entityId: string | null;
  entityName: string | null;
  state: RecommendationState;
  impactMinor: number | null;
  impactBasis: Basis | null;
  currency: string;
  explanation: string;
  openedAt: string;
  appliedAt: string | null;
};

export async function listRecommendations(ctx: TenantContext): Promise<RecommendationRow[]> {
  const res = await ctx.query<{
    id: string;
    rule: string;
    entity_id: string | null;
    entity_name: string | null;
    state: RecommendationState;
    impact_minor: number | null;
    impact_basis: Basis | null;
    currency: string;
    explanation: string;
    opened_at: Date;
    applied_at: Date | null;
  }>(
    `SELECT r.id, r.rule, r.entity_id, e.name AS entity_name,
            r.state::text AS state,
            r.impact_minor, r.impact_basis::text AS impact_basis,
            r.currency, r.explanation, r.opened_at, r.applied_at
     FROM recommendation r
     LEFT JOIN entity e ON e.id = r.entity_id
     WHERE r.tenant_id = $1
     ORDER BY
       CASE r.state
         WHEN 'open'         THEN 1
         WHEN 'accepted'     THEN 2
         WHEN 'applied'      THEN 3
         WHEN 'verifying'    THEN 4
         WHEN 'confirmed'    THEN 5
         WHEN 'not_observed' THEN 6
       END,
       COALESCE(r.impact_minor, 0) DESC,
       r.opened_at DESC`,
    [ctx.tenantId],
  );
  return res.rows.map((r) => ({
    id: r.id,
    rule: r.rule,
    entityId: r.entity_id,
    entityName: r.entity_name,
    state: r.state,
    impactMinor: r.impact_minor === null ? null : Number(r.impact_minor),
    impactBasis: r.impact_basis,
    currency: r.currency,
    explanation: r.explanation,
    openedAt: r.opened_at.toISOString(),
    appliedAt: r.applied_at?.toISOString() ?? null,
  }));
}

export type SavingsSummary = {
  lifetimeMinor: number;
  currency: string | null;
  verifyingCount: number;
  notObservedCount: number;
};

export type MonthlySaving = { month: string; amountMinor: number; currency: string };

export async function monthlySavings(
  ctx: TenantContext,
  months = 12,
): Promise<MonthlySaving[]> {
  const res = await ctx.query<{ month: string; total: number; currency: string }>(
    `SELECT to_char(date_trunc('month', confirmed_at), 'YYYY-MM') AS month,
            COALESCE(SUM(amount_minor), 0)::bigint AS total,
            MAX(currency) AS currency
     FROM saving
     WHERE tenant_id = $1
       AND confirmed_at >= (date_trunc('month', CURRENT_DATE) - ($2 - 1 || ' months')::interval)
     GROUP BY 1
     ORDER BY 1`,
    [ctx.tenantId, months],
  );
  return res.rows.map((r) => ({
    month: r.month,
    amountMinor: Number(r.total),
    currency: r.currency ?? "EUR",
  }));
}

export type FunnelStage = {
  state: RecommendationState;
  count: number;
  totalImpactMinor: number;
};

export async function verificationFunnel(ctx: TenantContext): Promise<FunnelStage[]> {
  const res = await ctx.query<{
    state: RecommendationState;
    n: number;
    impact: number;
  }>(
    `SELECT state::text AS state, COUNT(*)::int AS n,
            COALESCE(SUM(impact_minor), 0)::bigint AS impact
     FROM recommendation
     WHERE tenant_id = $1
     GROUP BY state`,
    [ctx.tenantId],
  );
  const byState = new Map(res.rows.map((r) => [r.state, r]));
  const order: RecommendationState[] = [
    "open",
    "accepted",
    "applied",
    "verifying",
    "confirmed",
    "not_observed",
  ];
  return order.map((state) => {
    const row = byState.get(state);
    return {
      state,
      count: row?.n ?? 0,
      totalImpactMinor: row ? Number(row.impact) : 0,
    };
  });
}

export type RuleEffectivenessRow = {
  rule: string;
  opened: number;
  confirmed: number;
  notObserved: number;
  pending: number;
  confirmationRate: number | null;    // confirmed / (confirmed + not_observed)
  confirmedAmountMinor: number;
};

export async function ruleEffectiveness(
  ctx: TenantContext,
): Promise<RuleEffectivenessRow[]> {
  const res = await ctx.query<{
    rule: string;
    opened: number;
    confirmed: number;
    not_observed: number;
    pending: number;
    confirmed_amount: number;
  }>(
    `SELECT r.rule,
            COUNT(*)::int AS opened,
            COUNT(*) FILTER (WHERE r.state = 'confirmed')::int    AS confirmed,
            COUNT(*) FILTER (WHERE r.state = 'not_observed')::int AS not_observed,
            COUNT(*) FILTER (WHERE r.state NOT IN ('confirmed', 'not_observed'))::int AS pending,
            COALESCE(SUM(s.amount_minor), 0)::bigint AS confirmed_amount
     FROM recommendation r
     LEFT JOIN saving s ON s.recommendation_id = r.id AND s.tenant_id = r.tenant_id
     WHERE r.tenant_id = $1
     GROUP BY r.rule
     ORDER BY confirmed_amount DESC, opened DESC`,
    [ctx.tenantId],
  );
  return res.rows.map((r) => {
    const closed = r.confirmed + r.not_observed;
    return {
      rule: r.rule,
      opened: r.opened,
      confirmed: r.confirmed,
      notObserved: r.not_observed,
      pending: r.pending,
      confirmationRate: closed > 0 ? (r.confirmed / closed) * 100 : null,
      confirmedAmountMinor: Number(r.confirmed_amount),
    };
  });
}

export async function savingsSummary(ctx: TenantContext): Promise<SavingsSummary> {
  const s = await ctx.query<{ total: number; currency: string | null }>(
    `SELECT COALESCE(SUM(amount_minor), 0)::bigint AS total, MAX(currency) AS currency
     FROM saving WHERE tenant_id = $1`,
    [ctx.tenantId],
  );
  const c = await ctx.query<{ state: RecommendationState; n: number }>(
    `SELECT state::text AS state, COUNT(*)::int AS n
     FROM recommendation
     WHERE tenant_id = $1 AND state IN ('verifying', 'not_observed')
     GROUP BY state`,
    [ctx.tenantId],
  );
  return {
    lifetimeMinor: Number(s.rows[0]?.total ?? 0),
    currency: s.rows[0]?.currency ?? null,
    verifyingCount: c.rows.find((r) => r.state === "verifying")?.n ?? 0,
    notObservedCount: c.rows.find((r) => r.state === "not_observed")?.n ?? 0,
  };
}

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
     VALUES ($1, $2, $3, $4, $5::basis, $6, $7) RETURNING id`,
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
     SET state = $3::recommendation_state,
         applied_at = CASE WHEN $3::recommendation_state = 'applied' THEN now() ELSE applied_at END
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
     VALUES ($1, $2::recommendation_state, $3::recommendation_state, $4, $5)`,
    [recommendationId, from, to, actor, note],
  );
}
