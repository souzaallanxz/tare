import type { Basis, IsoDate } from "@tare/core";
import type { TenantContext } from "../tenant-context.ts";

export type CloudInfraRow = {
  usageDate: IsoDate;
  provider: "azure" | "aws" | "gcp";
  service: string;
  resourceGroup: string | null;
  region: string | null;
  costMinor: number;
  costBasis: Basis;
  currency: string;
  source: string;
};

export async function upsertCloudInfra(
  ctx: TenantContext,
  rows: readonly CloudInfraRow[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const values: unknown[] = [];
  const tuples = rows.map((r, i) => {
    const p = i * 9;
    values.push(
      ctx.tenantId,
      r.usageDate,
      r.provider,
      r.service,
      r.resourceGroup,
      r.region,
      r.costMinor,
      r.costBasis,
      r.currency,
    );
    return `($${p + 1}, $${p + 2}, $${p + 3}, $${p + 4}, $${p + 5}, $${p + 6}, $${p + 7}, $${p + 8}::basis, $${p + 9}, now(), ${sqlLit(rows[i]!.source)})`;
  });
  const res = await ctx.query(
    `INSERT INTO cloud_infra_daily
       (tenant_id, usage_date, provider, service, resource_group, region,
        cost_minor, cost_basis, currency, ingested_at, source)
     VALUES ${tuples.join(", ")}
     ON CONFLICT (tenant_id, usage_date, provider, service, COALESCE(resource_group, ''), COALESCE(region, ''))
     DO UPDATE SET
       cost_minor = EXCLUDED.cost_minor,
       cost_basis = EXCLUDED.cost_basis,
       currency = EXCLUDED.currency,
       ingested_at = EXCLUDED.ingested_at,
       source = EXCLUDED.source`,
    values,
  );
  return res.rowCount ?? 0;
}

export async function clearCloudInfra(ctx: TenantContext, provider?: "azure" | "aws" | "gcp"): Promise<void> {
  if (provider) {
    await ctx.query(
      `DELETE FROM cloud_infra_daily WHERE tenant_id = $1 AND provider = $2`,
      [ctx.tenantId, provider],
    );
  } else {
    await ctx.query(`DELETE FROM cloud_infra_daily WHERE tenant_id = $1`, [ctx.tenantId]);
  }
}

export type CloudInfraSummary = {
  totalMinor: number;
  basis: Basis;
  currency: string;
  rows: number;
  windowStart: IsoDate | null;
  windowEnd: IsoDate | null;
  byService: { service: string; costMinor: number }[];
};

export async function cloudInfraSummary(
  ctx: TenantContext,
  start: IsoDate,
  end: IsoDate,
): Promise<CloudInfraSummary> {
  const total = await ctx.query<{ total: number; rows: number; billed_pct: number; currency: string; start: string | null; end: string | null }>(
    `SELECT COALESCE(SUM(cost_minor), 0)::bigint AS total,
            COUNT(*)::int AS rows,
            (100.0 * SUM(CASE WHEN cost_basis='billed' THEN cost_minor ELSE 0 END) / NULLIF(SUM(cost_minor), 0))::float AS billed_pct,
            MAX(currency) AS currency,
            MIN(usage_date)::text AS start,
            MAX(usage_date)::text AS end
     FROM cloud_infra_daily
     WHERE tenant_id = $1 AND usage_date BETWEEN $2 AND $3`,
    [ctx.tenantId, start, end],
  );
  const t = total.rows[0]!;
  const byService = await ctx.query<{ service: string; total: number }>(
    `SELECT service, SUM(cost_minor)::bigint AS total
     FROM cloud_infra_daily
     WHERE tenant_id = $1 AND usage_date BETWEEN $2 AND $3
     GROUP BY service
     ORDER BY total DESC
     LIMIT 6`,
    [ctx.tenantId, start, end],
  );
  return {
    totalMinor: Number(t.total),
    basis: (t.billed_pct ?? 0) >= 99.99 ? "billed" : "estimated",
    currency: t.currency ?? "EUR",
    rows: t.rows,
    windowStart: t.start,
    windowEnd: t.end,
    byService: byService.rows.map((r) => ({ service: r.service, costMinor: Number(r.total) })),
  };
}

function sqlLit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}
