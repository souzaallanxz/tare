import { toIsoDate } from "@tare/core";
import { detectAnomalies } from "@tare/rules";
import type { TenantContext } from "@tare/db";

/**
 * Scans each entity's rolling 60 days of daily cost and writes detected
 * anomalies to the `anomaly` table. Idempotent per (tenant, entity, date,
 * direction) — re-runs update the score/baseline in place rather than
 * duplicating rows.
 *
 * Called after every ingestion. The anomaly table itself is history; even
 * once a signal disappears from newer windows the row stays as a record.
 */
export async function detectAnomaliesForTenant(
  ctx: TenantContext,
  opts: { window?: number; k?: number; lookbackDays?: number } = {},
): Promise<{ scanned: number; written: number }> {
  const lookback = opts.lookbackDays ?? 60;
  const window = opts.window ?? 28;
  const k = opts.k ?? 3;

  const rows = await ctx.query<{
    entity_id: string;
    usage_date: string;
    cost_minor: number;
    currency: string;
  }>(
    `SELECT u.entity_id,
            u.usage_date::text AS usage_date,
            SUM(u.cost_minor)::bigint AS cost_minor,
            MAX(u.currency) AS currency
     FROM usage_daily u
     WHERE u.tenant_id = $1
       AND u.usage_date >= (CURRENT_DATE - ($2 || ' days')::interval)
     GROUP BY u.entity_id, u.usage_date
     ORDER BY u.entity_id, u.usage_date`,
    [ctx.tenantId, lookback],
  );

  const byEntity = new Map<
    string,
    { series: { date: string; costMinor: number }[]; currency: string }
  >();
  for (const r of rows.rows) {
    const bucket = byEntity.get(r.entity_id) ?? { series: [], currency: r.currency };
    bucket.series.push({ date: r.usage_date, costMinor: Number(r.cost_minor) });
    bucket.currency = r.currency;
    byEntity.set(r.entity_id, bucket);
  }

  let written = 0;
  for (const [entityId, { series, currency }] of byEntity) {
    const anomalies = detectAnomalies(
      series.map((p) => ({ date: p.date, costMinor: p.costMinor })),
      { window, k },
    );
    for (const a of anomalies) {
      await ctx.query(
        `INSERT INTO anomaly
           (tenant_id, entity_id, detected_on, direction, score,
            baseline_median_minor, observed_minor, currency)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (tenant_id, entity_id, detected_on, direction) DO UPDATE
           SET score = EXCLUDED.score,
               baseline_median_minor = EXCLUDED.baseline_median_minor,
               observed_minor = EXCLUDED.observed_minor,
               currency = EXCLUDED.currency`,
        [
          ctx.tenantId,
          entityId,
          a.date,
          a.direction,
          a.score,
          a.baselineMedianMinor,
          a.observedMinor,
          currency,
        ],
      );
      written++;
    }
  }

  return { scanned: byEntity.size, written };
}

export function anomaliesToday(): string {
  return toIsoDate(new Date());
}
