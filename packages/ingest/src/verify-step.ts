import { toIsoDate } from "@tare/core";
import type { TenantContext } from "@tare/db";
import { transitionRecommendation } from "@tare/db/repositories";
import { verifySaving } from "@tare/verify";

/**
 * Sweep every recommendation that is currently in state 'verifying' and see
 * if enough time has passed to reach a verdict. Confirmed savings write a
 * `saving` row and transition to 'confirmed'; those where billed cost did
 * not fall (or the window contains estimated data, or volume shifted too
 * much) transition to 'not_observed' with the reason.
 *
 * Deliberately silent when a recommendation is still pending — this is
 * called on every ingestion and should not thrash state.
 */
export async function sweepVerifications(ctx: TenantContext): Promise<{
  checked: number;
  confirmed: number;
  notObserved: number;
}> {
  const today = toIsoDate(new Date());
  const rows = await ctx.query<{
    id: string;
    entity_id: string;
    applied_at: Date;
    currency: string;
  }>(
    `SELECT id, entity_id, applied_at, currency
     FROM recommendation
     WHERE tenant_id = $1 AND state = 'verifying' AND entity_id IS NOT NULL AND applied_at IS NOT NULL`,
    [ctx.tenantId],
  );

  let confirmed = 0;
  let notObserved = 0;

  for (const r of rows.rows) {
    const appliedOn = toIsoDate(r.applied_at);
    const outcome = await verifySaving(ctx, r.entity_id, appliedOn, today);
    if (outcome.status === "pending") continue;

    if (outcome.status === "confirmed") {
      await ctx.query(
        `INSERT INTO saving
           (tenant_id, recommendation_id, amount_minor, basis, currency,
            window_start, window_end, method)
         VALUES ($1, $2, $3, 'billed', $4, $5, $6, $7)`,
        [
          ctx.tenantId,
          r.id,
          outcome.amountMinor,
          outcome.currency,
          outcome.windowStart,
          outcome.windowEnd,
          outcome.method,
        ],
      );
      await transitionRecommendation(ctx, r.id, "confirmed", "system", null);
      confirmed++;
    } else {
      await transitionRecommendation(ctx, r.id, "not_observed", "system", outcome.reason);
      notObserved++;
    }
  }

  return { checked: rows.rows.length, confirmed, notObserved };
}
