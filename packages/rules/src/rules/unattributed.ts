import type { Rule } from "../rule.ts";

/**
 * The headline metric. Never a euro amount, always a share of total.
 * Placing a euro figure on top would invite treating unattributed spend
 * as a recoverable saving, which it is not.
 */
export const unattributed: Rule = {
  id: "unattributed",
  title: "Unattributed spend",
  requires: ["usage_daily"],
  *run({ usage, currency, asOf }) {
    const total = usage.reduce((s, u) => s + u.costMinor, 0);
    if (total === 0) return;
    const unattr = usage.filter((u) => !u.hasOwner).reduce((s, u) => s + u.costMinor, 0);
    const pct = (unattr / total) * 100;
    if (pct < 5) return;
    yield {
      rule: "unattributed",
      entityExternalId: null,
      kind: "share",
      impactMinor: null,
      impactBasis: null,
      currency,
      explanation:
        `${pct.toFixed(1)}% of spend carries no tag, no job owner and no resolvable creator. ` +
        `Reported as a share of total, never as a recoverable amount.`,
      openedOn: asOf,
    };
  },
};
