import type { Rule } from "../rule.ts";

const SPOT_SAVINGS_FRACTION = 0.40;    // conservative middle of the 30–70% band
const MIN_JOB_COST_MINOR = 300_00;

/**
 * Scheduled jobs on on-demand VMs. Batch workloads that already retry on
 * failure tolerate spot preemption cheaply, and typically save 30–70% on
 * the compute portion of the bill. Streaming workloads and interactive
 * clusters are excluded because preemption is disruptive there.
 *
 * Signal today: entity.kind === "job". A finer signal (spot vs on-demand
 * from usage_metadata) would land once we ingest that column.
 */
export const spotCandidate: Rule = {
  id: "spot_candidate",
  title: "Job could run on spot instances",
  requires: ["usage_daily", "job_timeline"],
  *run({ usage, currency, asOf }) {
    const byEntity = new Map<string, number>();
    for (const u of usage) {
      if (u.entityKind !== "job") continue;
      byEntity.set(u.entityExternalId, (byEntity.get(u.entityExternalId) ?? 0) + u.costMinor);
    }
    for (const [entityExternalId, cost] of byEntity) {
      if (cost < MIN_JOB_COST_MINOR) continue;
      yield {
        rule: "spot_candidate",
        entityExternalId,
        kind: "cost",
        impactMinor: Math.round(cost * SPOT_SAVINGS_FRACTION),
        impactBasis: "estimated",
        currency,
        explanation:
          `${entityExternalId} is a scheduled job — a workload class that tolerates spot preemption ` +
          `well because retries are cheap. Moving compute to spot typically saves 30–70% on the VM ` +
          `line; ${(SPOT_SAVINGS_FRACTION * 100).toFixed(0)}% is a conservative middle. ` +
          `Impact is estimated until the change is applied and verified.`,
        openedOn: asOf,
      };
    }
  },
};
