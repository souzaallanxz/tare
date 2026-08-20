import type { Basis } from "@tare/core";
import { withTenant } from "@tare/db";

export type MonthlyReport = {
  tenantName: string;
  workspace: string;
  currency: "EUR" | "USD";
  period: string;                       // 'YYYY-MM'
  monthStart: string;
  monthEnd: string;
  billedMinor: number;
  billedBasis: Basis;
  budgetMinor: number | null;
  unattributedMinor: number;
  unattributedPct: number;
  ownerRows: OwnerRow[];
  confirmedSavingsMinor: number;
  savingsRows: SavingRow[];
  openFindings: FindingRow[];
  ingestedAt: string;
};

export type OwnerRow = { name: string; spendMinor: number; pct: number };
export type SavingRow = {
  confirmedAt: string;
  rule: string;
  entity: string | null;
  amountMinor: number;
  method: string;
};
export type FindingRow = {
  rule: string;
  entity: string | null;
  state: string;
  impactMinor: number | null;
  impactBasis: Basis | null;
};

export async function buildMonthlyReport(
  tenantId: string,
  tenantName: string,
  currency: "EUR" | "USD",
  period: string,
): Promise<MonthlyReport> {
  const [year, monthStr] = period.split("-");
  const monthIndex = Number(monthStr) - 1;
  const start = new Date(Date.UTC(Number(year), monthIndex, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(Number(year), monthIndex + 1, 0)).toISOString().slice(0, 10);

  return withTenant(tenantId, async (ctx) => {
    const workspaceRes = await ctx.query<{ total: number; billed_pct: number; currency: string }>(
      `SELECT COALESCE(SUM(cost_minor), 0)::bigint AS total,
              (100.0 * SUM(CASE WHEN cost_basis='billed' THEN cost_minor ELSE 0 END) / NULLIF(SUM(cost_minor), 0))::float AS billed_pct,
              MAX(currency) AS currency
       FROM rollup_daily_workspace
       WHERE tenant_id = $1 AND usage_date BETWEEN $2 AND $3`,
      [ctx.tenantId, start, end],
    );
    const workspace = workspaceRes.rows[0];
    const billedMinor = Number(workspace?.total ?? 0);
    const billedBasis: Basis = (workspace?.billed_pct ?? 0) >= 99.99 ? "billed" : "estimated";

    const budgetRes = await ctx.query<{ limit_minor: number }>(
      `SELECT limit_minor FROM budget
       WHERE tenant_id = $1 AND scope @> '{"type":"workspace"}'::jsonb AND period = 'monthly'
       LIMIT 1`,
      [ctx.tenantId],
    );
    const budgetMinor = budgetRes.rows[0] ? Number(budgetRes.rows[0].limit_minor) : null;

    const ownerRes = await ctx.query<{ name: string; spend: number }>(
      `SELECT COALESCE(o.name, 'Unattributed') AS name,
              SUM(r.cost_minor)::bigint AS spend
       FROM rollup_daily_owner r
       LEFT JOIN owner o ON o.id = r.owner_id
       WHERE r.tenant_id = $1 AND r.usage_date BETWEEN $2 AND $3
       GROUP BY o.name
       ORDER BY spend DESC`,
      [ctx.tenantId, start, end],
    );
    const totalOwner = ownerRes.rows.reduce((s, r) => s + Number(r.spend), 0);
    const ownerRows: OwnerRow[] = ownerRes.rows.map((r) => ({
      name: r.name,
      spendMinor: Number(r.spend),
      pct: totalOwner > 0 ? (Number(r.spend) / totalOwner) * 100 : 0,
    }));
    const unattr = ownerRows.find((r) => r.name === "Unattributed");
    const unattributedMinor = unattr?.spendMinor ?? 0;
    const unattributedPct = unattr?.pct ?? 0;

    const savingsRes = await ctx.query<{
      confirmed_at: Date;
      rule: string;
      entity_name: string | null;
      amount: number;
      method: string;
    }>(
      `SELECT s.confirmed_at, r.rule, e.name AS entity_name,
              s.amount_minor::bigint AS amount, s.method
       FROM saving s
       JOIN recommendation r ON r.id = s.recommendation_id
       LEFT JOIN entity e ON e.id = r.entity_id
       WHERE s.tenant_id = $1 AND s.confirmed_at BETWEEN $2 AND ($3::date + INTERVAL '1 day')
       ORDER BY s.confirmed_at`,
      [ctx.tenantId, start, end],
    );
    const savingsRows: SavingRow[] = savingsRes.rows.map((r) => ({
      confirmedAt: r.confirmed_at.toISOString().slice(0, 10),
      rule: r.rule,
      entity: r.entity_name,
      amountMinor: Number(r.amount),
      method: r.method,
    }));
    const confirmedSavingsMinor = savingsRows.reduce((s, r) => s + r.amountMinor, 0);

    const findingsRes = await ctx.query<{
      rule: string;
      entity_name: string | null;
      state: string;
      impact_minor: number | null;
      impact_basis: Basis | null;
    }>(
      `SELECT rule, e.name AS entity_name, state::text AS state, impact_minor, impact_basis::text AS impact_basis
       FROM recommendation r
       LEFT JOIN entity e ON e.id = r.entity_id
       WHERE r.tenant_id = $1
         AND r.state IN ('open','accepted','applied','verifying')
       ORDER BY COALESCE(r.impact_minor, 0) DESC
       LIMIT 10`,
      [ctx.tenantId],
    );
    const openFindings: FindingRow[] = findingsRes.rows.map((r) => ({
      rule: r.rule,
      entity: r.entity_name,
      state: r.state,
      impactMinor: r.impact_minor === null ? null : Number(r.impact_minor),
      impactBasis: r.impact_basis,
    }));

    const runRes = await ctx.query<{ finished_at: Date | null }>(
      `SELECT finished_at FROM ingest_run
       WHERE tenant_id = $1 AND status = 'succeeded'
       ORDER BY finished_at DESC NULLS LAST LIMIT 1`,
      [ctx.tenantId],
    );

    return {
      tenantName,
      workspace: "prod",
      currency,
      period,
      monthStart: start,
      monthEnd: end,
      billedMinor,
      billedBasis,
      budgetMinor,
      unattributedMinor,
      unattributedPct,
      ownerRows,
      confirmedSavingsMinor,
      savingsRows,
      openFindings,
      ingestedAt: (runRes.rows[0]?.finished_at ?? new Date()).toISOString(),
    };
  });
}
