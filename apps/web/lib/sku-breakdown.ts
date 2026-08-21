import type { Basis } from "@tare/core";
import { withTenant } from "@tare/db";

export type SkuRow = {
  sku: string;
  costMinor: number;
  basis: Basis;
  dbus: number;
  pct: number;
};

export async function getSkuBreakdown(
  tenantId: string,
  start: string,
  end: string,
): Promise<SkuRow[]> {
  return withTenant(tenantId, async (ctx) => {
    const res = await ctx.query<{
      sku: string;
      cost: number;
      basis: Basis;
      dbus: number;
    }>(
      `SELECT sku,
              SUM(cost_minor)::bigint AS cost,
              CASE WHEN bool_or(cost_basis='estimated') THEN 'estimated' ELSE 'billed' END::basis AS basis,
              SUM(dbus)::float8 AS dbus
       FROM usage_daily
       WHERE tenant_id = $1 AND usage_date BETWEEN $2 AND $3
       GROUP BY sku
       ORDER BY cost DESC`,
      [ctx.tenantId, start, end],
    );
    const total = res.rows.reduce((s, r) => s + Number(r.cost), 0);
    return res.rows.map((r) => ({
      sku: r.sku,
      costMinor: Number(r.cost),
      basis: r.basis,
      dbus: Number(r.dbus),
      pct: total > 0 ? (Number(r.cost) / total) * 100 : 0,
    }));
  });
}
