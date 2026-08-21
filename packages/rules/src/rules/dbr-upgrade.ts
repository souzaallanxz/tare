import type { Rule } from "../rule.ts";

// Databricks runtime cadence. Non-LTS versions age fast; LTS gets ~2 years
// of support then goes deprecated. This list is conservative — anything at
// or below MIN_SUPPORTED_MAJOR gets flagged.
const MIN_SUPPORTED_MAJOR = 13;

const VERSION_RE = /^(\d+)\.(\d+)/;

/**
 * Deprecated Databricks Runtime. Older DBR releases lose security patches
 * and eventually stop starting. Impact is qualitative — the exact perf gain
 * depends on the workload, so basis is estimated and no euro figure is
 * quoted unless there is observed cost on the entity.
 */
export const dbrUpgrade: Rule = {
  id: "dbr_upgrade",
  title: "Runtime version needs upgrading",
  requires: ["usage_daily", "cluster_config"],
  *run({ configs, usage, currency, asOf }) {
    const latest = new Map<string, (typeof configs)[number]>();
    for (const c of configs) {
      const prev = latest.get(c.entityExternalId);
      if (!prev || c.observedOn > prev.observedOn) latest.set(c.entityExternalId, c);
    }

    for (const [entityExternalId, cfg] of latest) {
      if (!cfg.runtimeVersion) continue;
      const match = VERSION_RE.exec(cfg.runtimeVersion);
      if (!match) continue;
      const major = Number(match[1]);
      if (major >= MIN_SUPPORTED_MAJOR) continue;

      const cost = usage
        .filter((u) => u.entityExternalId === entityExternalId)
        .reduce((s, u) => s + u.costMinor, 0);

      yield {
        rule: "dbr_upgrade",
        entityExternalId,
        kind: "cost",
        impactMinor: cost > 0 ? Math.round(cost * 0.08) : null,
        impactBasis: "estimated",
        currency,
        explanation:
          `${entityExternalId} runs on DBR ${cfg.runtimeVersion}. Anything below ${MIN_SUPPORTED_MAJOR}.x ` +
          `is out of active support: security patches stop and newer releases include ` +
          `performance work that typically shaves single-digit percentages off the same workload. ` +
          `The amount shown is a rough upper bound — measurement lands after upgrade.`,
        openedOn: asOf,
      };
    }
  },
};
