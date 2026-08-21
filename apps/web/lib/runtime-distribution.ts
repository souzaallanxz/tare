import { withTenant } from "@tare/db";

export type RuntimeRow = {
  runtimeVersion: string | null;
  entities: number;
  costMinor: number;
  pct: number;
};

export async function getRuntimeDistribution(tenantId: string): Promise<RuntimeRow[]> {
  return withTenant(tenantId, async (ctx) => {
    const res = await ctx.query<{ runtime: string | null; entities: number; cost: number }>(
      `WITH latest AS (
         SELECT DISTINCT ON (entity_id) entity_id, runtime_version
         FROM entity_config_daily
         WHERE tenant_id = $1
         ORDER BY entity_id, observed_on DESC
       )
       SELECT l.runtime_version AS runtime,
              COUNT(DISTINCT e.id)::int AS entities,
              COALESCE(SUM(u.cost_minor), 0)::bigint AS cost
       FROM entity e
       LEFT JOIN latest l ON l.entity_id = e.id
       LEFT JOIN usage_daily u ON u.entity_id = e.id
         AND u.usage_date >= (CURRENT_DATE - INTERVAL '30 days')
       WHERE e.tenant_id = $1
       GROUP BY l.runtime_version
       ORDER BY cost DESC NULLS LAST`,
      [ctx.tenantId],
    );
    const total = res.rows.reduce((s, r) => s + Number(r.cost), 0);
    return res.rows.map((r) => ({
      runtimeVersion: r.runtime,
      entities: r.entities,
      costMinor: Number(r.cost),
      pct: total > 0 ? (Number(r.cost) / total) * 100 : 0,
    }));
  });
}
