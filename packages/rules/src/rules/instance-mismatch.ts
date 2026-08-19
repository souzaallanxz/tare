import type { Rule } from "../rule.ts";

const MEMORY_OPTIMISED = /^(Standard_E|r5|r6i|r7i|m5d\.[24]xl)/i;
const COMPUTE_OPTIMISED = /^(Standard_F|c5|c6i|c7i)/i;

/**
 * Node profile does not match workload character. Impact is a counterfactual,
 * so basis is always estimated.
 */
export const instanceMismatch: Rule = {
  id: "instance_mismatch",
  title: "Instance-type mismatch",
  requires: ["usage_daily", "cluster_config"],
  *run({ configs, usage, currency, asOf }) {
    const latest = new Map<string, (typeof configs)[number]>();
    for (const c of configs) {
      const prev = latest.get(c.entityExternalId);
      if (!prev || c.observedOn > prev.observedOn) latest.set(c.entityExternalId, c);
    }
    for (const [entityExternalId, cfg] of latest) {
      if (!cfg.nodeType) continue;
      const cost = usage
        .filter((u) => u.entityExternalId === entityExternalId)
        .reduce((s, u) => s + u.costMinor, 0);
      if (cost < 500_00) continue;

      let mismatch = false;
      let hint = "";
      if (MEMORY_OPTIMISED.test(cfg.nodeType)) {
        mismatch = true;
        hint = "memory-optimised node on a workload without a large working set";
      } else if (COMPUTE_OPTIMISED.test(cfg.nodeType)) {
        mismatch = true;
        hint = "compute-optimised node on a workload that is not CPU-bound";
      }
      if (!mismatch) continue;

      yield {
        rule: "instance_mismatch",
        entityExternalId,
        kind: "cost",
        impactMinor: Math.round(cost * 0.15),
        impactBasis: "estimated",
        currency,
        explanation:
          `${entityExternalId} runs on a ${hint}. A different node type at the same DBUs would cost less. ` +
          `This is a counterfactual, so the amount is reported as an estimate.`,
        openedOn: asOf,
      };
    }
  },
};
