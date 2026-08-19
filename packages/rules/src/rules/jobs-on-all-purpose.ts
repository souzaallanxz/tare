import type { Rule } from "../rule.ts";

/**
 * Scheduled workloads paying the all-purpose DBU rate. Impact = rate delta × DBUs.
 * Basis: billed (rate delta is a known number).
 */
export const jobsOnAllPurpose: Rule = {
  id: "jobs_on_all_purpose",
  title: "Jobs on all-purpose compute",
  requires: ["usage_daily", "job_timeline"],
  *run({ usage, rates, asOf, currency }) {
    const byEntity = new Map<string, number>();
    for (const u of usage) {
      if (u.entityKind !== "job") continue;
      if (!/all[-_ ]?purpose/i.test(u.sku)) continue;
      byEntity.set(u.entityExternalId, (byEntity.get(u.entityExternalId) ?? 0) + u.dbus);
    }
    for (const [entityExternalId, dbus] of byEntity) {
      const allPurpose = rates("ALL_PURPOSE_COMPUTE", asOf);
      const jobs = rates("JOBS_COMPUTE", asOf);
      const deltaMinor = Math.max(0, allPurpose.rateMinor - jobs.rateMinor);
      const impactMinor = Math.round(dbus * deltaMinor);
      if (impactMinor <= 0) continue;
      yield {
        rule: "jobs_on_all_purpose",
        entityExternalId,
        kind: "cost",
        impactMinor,
        impactBasis: "billed",
        currency,
        explanation:
          `${entityExternalId} ran on all-purpose compute. Switching to jobs compute keeps the same DBUs at a lower rate; ` +
          `the amount shown is the rate difference over observed usage.`,
        openedOn: asOf,
      };
    }
  },
};
