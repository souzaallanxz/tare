import type { Rule } from "../rule.ts";

export const idleWarehouse: Rule = {
  id: "idle_warehouse",
  title: "Idle SQL warehouse",
  requires: ["usage_daily", "query_history"],
  *run({ usage, currency, asOf }) {
    const byWarehouse = new Map<string, number>();
    for (const u of usage) {
      if (u.entityKind !== "warehouse") continue;
      byWarehouse.set(u.entityExternalId, (byWarehouse.get(u.entityExternalId) ?? 0) + u.costMinor);
    }
    for (const [entityExternalId, costMinor] of byWarehouse) {
      if (costMinor < 100_00) continue;
      yield {
        rule: "idle_warehouse",
        entityExternalId,
        kind: "cost",
        impactMinor: Math.round(costMinor * 0.6),
        impactBasis: "billed",
        currency,
        explanation:
          `${entityExternalId} stayed up with query volume in the lowest decile. Auto-stop would recover most of this.`,
        openedOn: asOf,
      };
    }
  },
};
