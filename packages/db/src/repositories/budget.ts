import type { TenantContext } from "../tenant-context.ts";

export type BudgetScope =
  | { type: "workspace" }
  | { type: "owner"; ownerId: string };

export type Budget = {
  id: string;
  scope: BudgetScope;
  scopeLabel: string;
  period: "monthly" | "quarterly";
  limitMinor: number;
  thresholdPct: number;
  currency: string;
};

export async function listBudgets(ctx: TenantContext): Promise<Budget[]> {
  const res = await ctx.query<{
    id: string;
    scope: BudgetScope;
    period: "monthly" | "quarterly";
    limit_minor: number;
    threshold_pct: number;
    currency: string;
    owner_name: string | null;
  }>(
    `SELECT b.id, b.scope, b.period, b.limit_minor, b.threshold_pct, b.currency,
            o.name AS owner_name
     FROM budget b
     LEFT JOIN owner o ON o.id::text = (b.scope->>'ownerId')
     WHERE b.tenant_id = $1
     ORDER BY b.limit_minor DESC`,
    [ctx.tenantId],
  );
  return res.rows.map((r) => ({
    id: r.id,
    scope: r.scope,
    scopeLabel:
      r.scope.type === "workspace"
        ? "Workspace"
        : `Owner · ${r.owner_name ?? "unknown"}`,
    period: r.period,
    limitMinor: Number(r.limit_minor),
    thresholdPct: r.threshold_pct,
    currency: r.currency,
  }));
}

export async function upsertBudget(
  ctx: TenantContext,
  input: {
    scope: BudgetScope;
    period: "monthly" | "quarterly";
    limitMinor: number;
    thresholdPct: number;
    currency: string;
  },
): Promise<string> {
  // No natural key on (tenant, scope, period). Delete-then-insert keeps the
  // "one active budget per scope" invariant simple.
  await ctx.query(
    `DELETE FROM budget
     WHERE tenant_id = $1 AND scope = $2::jsonb AND period = $3`,
    [ctx.tenantId, JSON.stringify(input.scope), input.period],
  );
  const res = await ctx.query<{ id: string }>(
    `INSERT INTO budget (tenant_id, scope, period, limit_minor, threshold_pct, currency)
     VALUES ($1, $2::jsonb, $3, $4, $5, $6)
     RETURNING id`,
    [
      ctx.tenantId,
      JSON.stringify(input.scope),
      input.period,
      input.limitMinor,
      input.thresholdPct,
      input.currency,
    ],
  );
  return res.rows[0]!.id;
}

export async function deleteBudget(ctx: TenantContext, id: string): Promise<void> {
  await ctx.query(`DELETE FROM budget WHERE tenant_id = $1 AND id = $2`, [ctx.tenantId, id]);
}
