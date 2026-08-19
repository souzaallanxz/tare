import type { Basis, IsoDate, Money } from "@tare/core";
import type { TenantContext } from "../tenant-context.ts";

export type UsageRow = {
  usageDate: IsoDate;
  entityId: string;
  sku: string;
  dbus: number;
  cost: Money;
  listCostMinor: number;
};

export async function upsertUsageDaily(
  ctx: TenantContext,
  rows: readonly UsageRow[],
  ingestRunId: string,
): Promise<number> {
  if (rows.length === 0) return 0;

  const values: unknown[] = [];
  const tuples = rows.map((r, i) => {
    const p = i * 9;
    values.push(
      ctx.tenantId,
      r.usageDate,
      r.entityId,
      r.sku,
      r.dbus,
      r.cost.amount,
      r.cost.basis,
      r.listCostMinor,
      r.cost.currency,
    );
    return `($${p + 1},$${p + 2},$${p + 3},$${p + 4},$${p + 5},$${p + 6},$${p + 7},$${p + 8},$${p + 9},now(),$${rows.length * 9 + 1})`;
  });
  values.push(ingestRunId);

  const sql = `
    INSERT INTO usage_daily
      (tenant_id, usage_date, entity_id, sku, dbus, cost_minor, cost_basis, list_cost_minor, currency, ingested_at, ingest_run_id)
    VALUES ${tuples.join(",")}
    ON CONFLICT (tenant_id, usage_date, entity_id, sku) DO UPDATE SET
      dbus = EXCLUDED.dbus,
      cost_minor = EXCLUDED.cost_minor,
      cost_basis = EXCLUDED.cost_basis,
      list_cost_minor = EXCLUDED.list_cost_minor,
      currency = EXCLUDED.currency,
      ingested_at = EXCLUDED.ingested_at,
      ingest_run_id = EXCLUDED.ingest_run_id
  `;
  const res = await ctx.query(sql, values);
  return res.rowCount ?? 0;
}

export type WorkspaceDailyPoint = {
  usageDate: IsoDate;
  costMinor: number;
  basis: Basis;
  currency: string;
};

export async function workspaceDailyBetween(
  ctx: TenantContext,
  start: IsoDate,
  end: IsoDate,
): Promise<WorkspaceDailyPoint[]> {
  const res = await ctx.query<{
    usage_date: string;
    cost_minor: number;
    cost_basis: Basis;
    currency: string;
  }>(
    `SELECT usage_date, cost_minor, cost_basis, currency
     FROM rollup_daily_workspace
     WHERE tenant_id = $1 AND usage_date BETWEEN $2 AND $3
     ORDER BY usage_date`,
    [ctx.tenantId, start, end],
  );
  return res.rows.map((r) => ({
    usageDate: r.usage_date,
    costMinor: r.cost_minor,
    basis: r.cost_basis,
    currency: r.currency,
  }));
}
