import type { IsoDate } from "@tare/core";
import { addDays } from "@tare/core";
import type { TenantContext } from "@tare/db";

const VERIFICATION_WINDOW_DAYS = 28;

export type VerificationOutcome =
  | {
      status: "confirmed";
      amountMinor: number;         // billed delta, positive means saved
      currency: string;
      windowStart: IsoDate;
      windowEnd: IsoDate;
      method: string;
    }
  | { status: "not_observed"; reason: string; windowStart: IsoDate; windowEnd: IsoDate }
  | { status: "pending"; daysElapsed: number; daysNeeded: number };

/**
 * Verify a saving. Compare the entity's billed cost in the 28 days after
 * `appliedOn` against the 28 days before, controlling for run volume where
 * a proxy exists. Only billed delta becomes a confirmed saving.
 */
export async function verifySaving(
  ctx: TenantContext,
  entityId: string,
  appliedOn: IsoDate,
  today: IsoDate,
): Promise<VerificationOutcome> {
  const daysElapsed = daysBetween(appliedOn, today);
  if (daysElapsed < VERIFICATION_WINDOW_DAYS) {
    return { status: "pending", daysElapsed, daysNeeded: VERIFICATION_WINDOW_DAYS };
  }

  const preStart = addDays(appliedOn, -VERIFICATION_WINDOW_DAYS);
  const postEnd = addDays(appliedOn, VERIFICATION_WINDOW_DAYS - 1);

  const rows = await ctx.query<{ window: "pre" | "post"; cost: number; runs: number; currency: string; billed_pct: number }>(
    `WITH windowed AS (
       SELECT
         CASE WHEN usage_date < $2::date THEN 'pre' ELSE 'post' END AS window,
         cost_minor, cost_basis, currency
       FROM usage_daily
       WHERE tenant_id = $1 AND entity_id = $3
         AND usage_date BETWEEN $4 AND $5
     )
     SELECT window,
            SUM(cost_minor)::bigint AS cost,
            COUNT(*)::int          AS runs,
            MAX(currency)          AS currency,
            (100.0 * SUM(CASE WHEN cost_basis='billed' THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0))::float AS billed_pct
     FROM windowed
     GROUP BY window`,
    [ctx.tenantId, appliedOn, entityId, preStart, postEnd],
  );

  const pre = rows.rows.find((r) => r.window === "pre");
  const post = rows.rows.find((r) => r.window === "post");

  if (!pre || !post) {
    return {
      status: "not_observed",
      reason: "Not enough data on one side of the change to compare.",
      windowStart: preStart,
      windowEnd: postEnd,
    };
  }
  if (pre.billed_pct < 100 || post.billed_pct < 100) {
    return {
      status: "not_observed",
      reason: "One of the windows contains estimated cost; a billed saving cannot be confirmed.",
      windowStart: preStart,
      windowEnd: postEnd,
    };
  }
  if (Math.abs(post.runs - pre.runs) / Math.max(pre.runs, 1) > 0.3) {
    return {
      status: "not_observed",
      reason: `Run volume changed by more than 30% (${pre.runs} → ${post.runs}); no comparable baseline.`,
      windowStart: preStart,
      windowEnd: postEnd,
    };
  }

  const delta = pre.cost - post.cost;
  if (delta <= 0) {
    return {
      status: "not_observed",
      reason: "Billed cost did not fall in the 28 days after the change.",
      windowStart: preStart,
      windowEnd: postEnd,
    };
  }
  return {
    status: "confirmed",
    amountMinor: delta,
    currency: pre.currency,
    windowStart: preStart,
    windowEnd: postEnd,
    method: "28d_paired_baseline_billed_only",
  };
}

function daysBetween(a: IsoDate, b: IsoDate): number {
  const ms = new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}
