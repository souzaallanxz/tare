import type { IsoDate } from "@tare/core";
import { toIsoDate } from "@tare/core";
import type { TenantContext } from "@tare/db";
import { recomputeRollups } from "./pipeline.ts";

/**
 * Reclassify usage_daily against the current rate_card.
 *
 * For every row, find the latest rate_card entry with matching SKU and
 * effective_from ≤ usage_date. If present, cost_minor becomes
 * `dbus × rate_minor` and cost_basis flips to `billed`. If absent, the row
 * falls back to list_cost_minor and `estimated`.
 *
 * Fully idempotent. Safe to run after any rate_card change. Also runs after
 * ingestion so freshly-inserted rows get the same treatment.
 */
export async function reclassifyUsage(
  ctx: TenantContext,
  opts: { from?: IsoDate; to?: IsoDate } = {},
): Promise<{ updated: number }> {
  const to = opts.to ?? toIsoDate(new Date());
  const from = opts.from ?? "1900-01-01";

  const res = await ctx.query<{ n: number }>(
    `WITH applicable AS (
       SELECT u.tenant_id, u.usage_date, u.entity_id, u.sku,
              (
                SELECT rc.rate_minor
                FROM rate_card rc
                WHERE rc.tenant_id = u.tenant_id
                  AND rc.sku = u.sku
                  AND rc.effective_from <= u.usage_date
                ORDER BY rc.effective_from DESC
                LIMIT 1
              ) AS rate_minor
       FROM usage_daily u
       WHERE u.tenant_id = $1 AND u.usage_date BETWEEN $2 AND $3
     )
     UPDATE usage_daily u
     SET cost_minor = CASE
           WHEN a.rate_minor IS NULL THEN u.list_cost_minor
           ELSE (u.dbus * a.rate_minor)::bigint
         END,
         cost_basis = CASE
           WHEN a.rate_minor IS NULL THEN 'estimated'::basis
           ELSE 'billed'::basis
         END
     FROM applicable a
     WHERE u.tenant_id = a.tenant_id
       AND u.usage_date = a.usage_date
       AND u.entity_id = a.entity_id
       AND u.sku = a.sku
     RETURNING 1`,
    [ctx.tenantId, from, to],
  );

  const updated = res.rowCount ?? 0;

  // Rollups need to reflect the new basis. Only recompute the touched window;
  // if the caller passed no bounds, recompute everything currently in facts.
  if (updated > 0) {
    const range = await ctx.query<{ min: string | null; max: string | null }>(
      `SELECT MIN(usage_date)::text AS min, MAX(usage_date)::text AS max
       FROM usage_daily WHERE tenant_id = $1`,
      [ctx.tenantId],
    );
    const min = range.rows[0]?.min ?? from;
    const max = range.rows[0]?.max ?? to;
    await recomputeRollups(ctx, min, max);
  }

  return { updated };
}
