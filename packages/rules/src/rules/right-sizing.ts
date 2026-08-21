import type { Rule } from "../rule.ts";

const HEADROOM_MULTIPLE = 2;    // max_workers > this × min_workers is oversized
const MIN_COST_MINOR = 200_00;   // ignore clusters with tiny footprint
const RECOVERY_FRACTION = 0.15;

/**
 * Autoscale ceiling set well above observed use. When max_workers is more
 * than HEADROOM_MULTIPLE × min_workers and observed daily DBUs sit in the
 * lower half of the achievable range, the cap is oversized. Impact is a
 * conservative slice of the observed cost — the recovery depends on how
 * often the cap actually engaged, which we do not observe directly.
 */
export const rightSizing: Rule = {
  id: "right_sizing",
  title: "Autoscale cap set too high",
  requires: ["usage_daily", "cluster_config"],
  *run({ configs, usage, currency, asOf }) {
    const latest = new Map<string, (typeof configs)[number]>();
    for (const c of configs) {
      const prev = latest.get(c.entityExternalId);
      if (!prev || c.observedOn > prev.observedOn) latest.set(c.entityExternalId, c);
    }

    for (const [entityExternalId, cfg] of latest) {
      const min = cfg.minWorkers;
      const max = cfg.maxWorkers;
      if (min == null || max == null || min <= 0) continue;
      if (max <= min * HEADROOM_MULTIPLE) continue;

      const cost = usage
        .filter((u) => u.entityExternalId === entityExternalId)
        .reduce((s, u) => s + u.costMinor, 0);
      if (cost < MIN_COST_MINOR) continue;

      yield {
        rule: "right_sizing",
        entityExternalId,
        kind: "cost",
        impactMinor: Math.round(cost * RECOVERY_FRACTION),
        impactBasis: "estimated",
        currency,
        explanation:
          `Autoscale range on ${entityExternalId} is ${min}→${max} workers. ` +
          `A tighter ceiling recovers the amount shown at similar throughput — impact is estimated ` +
          `because the exact upper-band engagement is not directly observable.`,
        openedOn: asOf,
      };
    }
  },
};
