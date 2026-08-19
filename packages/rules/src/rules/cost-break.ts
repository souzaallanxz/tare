import { median, mad } from "../stats.ts";
import type { Rule } from "../rule.ts";

const K = 3;
const RECENT_DAYS = 7;
const BASELINE_DAYS = 28;

/**
 * Reports a workload whose 7-day mean exceeds its 28-day baseline by
 * median + K * MAD. This is a *change*, not a *cost*.
 */
export const costBreak: Rule = {
  id: "cost_break",
  title: "Cost break",
  requires: ["usage_daily"],
  *run({ usage, currency, asOf }) {
    const byEntity = new Map<string, Map<string, number>>();
    for (const u of usage) {
      let per = byEntity.get(u.entityExternalId);
      if (!per) byEntity.set(u.entityExternalId, (per = new Map()));
      per.set(u.usageDate, (per.get(u.usageDate) ?? 0) + u.costMinor);
    }

    for (const [entityExternalId, daily] of byEntity) {
      const series = [...daily.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
      if (series.length < BASELINE_DAYS + RECENT_DAYS) continue;

      const recent = series.slice(-RECENT_DAYS).map(([, v]) => v);
      const baseline = series.slice(-BASELINE_DAYS - RECENT_DAYS, -RECENT_DAYS).map(([, v]) => v);
      const recentMean = recent.reduce((s, v) => s + v, 0) / recent.length;
      const base = median(baseline);
      const scale = mad(baseline);
      if (scale === 0) continue;

      const score = (recentMean - base) / scale;
      if (score <= K) continue;

      yield {
        rule: "cost_break",
        entityExternalId,
        kind: "change",
        impactMinor: Math.round((recentMean - base) * RECENT_DAYS),
        impactBasis: "billed",
        currency,
        explanation:
          `The 7-day mean is ${(recentMean / base).toFixed(1)}× the 28-day baseline, past median plus ${K} MAD. ` +
          `This is reported as a change in cost, not as a saving available.`,
        openedOn: asOf,
      };
    }
  },
};
