import type { TenantContext } from "../tenant-context.ts";

export type AnomalyRow = {
  id: string;
  entityId: string | null;
  entityName: string | null;
  detectedOn: string;
  direction: "up" | "down";
  score: number;
  baselineMedianMinor: number;
  observedMinor: number;
  deltaMinor: number;
  currency: string;
  createdAt: string;
};

export async function listRecentAnomalies(
  ctx: TenantContext,
  opts: { days?: number; limit?: number } = {},
): Promise<AnomalyRow[]> {
  const days = opts.days ?? 30;
  const limit = opts.limit ?? 20;
  const res = await ctx.query<{
    id: string;
    entity_id: string | null;
    entity_name: string | null;
    detected_on: string;
    direction: "up" | "down";
    score: number;
    baseline_median_minor: number;
    observed_minor: number;
    currency: string;
    created_at: Date;
  }>(
    `SELECT a.id, a.entity_id, e.name AS entity_name,
            a.detected_on::text AS detected_on,
            a.direction, a.score::float8 AS score,
            a.baseline_median_minor, a.observed_minor,
            a.currency, a.created_at
     FROM anomaly a
     LEFT JOIN entity e ON e.id = a.entity_id
     WHERE a.tenant_id = $1
       AND a.detected_on >= (CURRENT_DATE - ($2 || ' days')::interval)
     ORDER BY a.detected_on DESC, ABS(a.score) DESC
     LIMIT $3`,
    [ctx.tenantId, days, limit],
  );
  return res.rows.map((r) => ({
    id: r.id,
    entityId: r.entity_id,
    entityName: r.entity_name,
    detectedOn: r.detected_on,
    direction: r.direction,
    score: Number(r.score),
    baselineMedianMinor: Number(r.baseline_median_minor),
    observedMinor: Number(r.observed_minor),
    deltaMinor: Number(r.observed_minor) - Number(r.baseline_median_minor),
    currency: r.currency,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function anomaliesForEntity(
  ctx: TenantContext,
  entityId: string,
  opts: { days?: number } = {},
): Promise<AnomalyRow[]> {
  const days = opts.days ?? 60;
  const res = await ctx.query<{
    id: string;
    entity_id: string | null;
    entity_name: string | null;
    detected_on: string;
    direction: "up" | "down";
    score: number;
    baseline_median_minor: number;
    observed_minor: number;
    currency: string;
    created_at: Date;
  }>(
    `SELECT a.id, a.entity_id, e.name AS entity_name,
            a.detected_on::text AS detected_on,
            a.direction, a.score::float8 AS score,
            a.baseline_median_minor, a.observed_minor,
            a.currency, a.created_at
     FROM anomaly a
     LEFT JOIN entity e ON e.id = a.entity_id
     WHERE a.tenant_id = $1 AND a.entity_id = $2
       AND a.detected_on >= (CURRENT_DATE - ($3 || ' days')::interval)
     ORDER BY a.detected_on DESC`,
    [ctx.tenantId, entityId, days],
  );
  return res.rows.map((r) => ({
    id: r.id,
    entityId: r.entity_id,
    entityName: r.entity_name,
    detectedOn: r.detected_on,
    direction: r.direction,
    score: Number(r.score),
    baselineMedianMinor: Number(r.baseline_median_minor),
    observedMinor: Number(r.observed_minor),
    deltaMinor: Number(r.observed_minor) - Number(r.baseline_median_minor),
    currency: r.currency,
    createdAt: r.created_at.toISOString(),
  }));
}
