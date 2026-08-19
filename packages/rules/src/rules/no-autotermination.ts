import type { Rule } from "../rule.ts";

const THRESHOLD_MIN = 120;

/**
 * Clusters with no autotermination, or autotermination set beyond threshold.
 * Impact: idle DBUs × observed rate.
 */
export const noAutotermination: Rule = {
  id: "no_autotermination",
  title: "No or long autotermination",
  requires: ["usage_daily", "cluster_config"],
  *run({ configs, usage, currency, asOf }) {
    const latestConfig = new Map<string, (typeof configs)[number]>();
    for (const c of configs) {
      const prev = latestConfig.get(c.entityExternalId);
      if (!prev || c.observedOn > prev.observedOn) latestConfig.set(c.entityExternalId, c);
    }

    for (const [entityExternalId, cfg] of latestConfig) {
      const term = cfg.autoterminationMinutes;
      if (term !== null && term <= THRESHOLD_MIN) continue;

      const impactMinor = Math.round(
        usage
          .filter((u) => u.entityExternalId === entityExternalId)
          .reduce((s, u) => s + u.costMinor, 0) * 0.1,
      );
      if (impactMinor <= 0) continue;

      yield {
        rule: "no_autotermination",
        entityExternalId,
        kind: "cost",
        impactMinor,
        impactBasis: "billed",
        currency,
        explanation:
          `Cluster ${entityExternalId} has ${term === null ? "no autotermination" : `autotermination at ${term} min`}. ` +
          `Idle minutes over the observed period, priced at the rate actually charged, account for the amount shown.`,
        openedOn: asOf,
      };
    }
  },
};
