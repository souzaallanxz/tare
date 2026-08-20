import { costBreak } from "./rules/cost-break.ts";
import { idleWarehouse } from "./rules/idle-warehouse.ts";
import { instanceMismatch } from "./rules/instance-mismatch.ts";
import { jobsOnAllPurpose } from "./rules/jobs-on-all-purpose.ts";
import { noAutotermination } from "./rules/no-autotermination.ts";
import { unattributed } from "./rules/unattributed.ts";
import type { Rule } from "./rule.ts";

export * from "./rule.ts";
export * from "./stats.ts";
export * from "./forecast.ts";
export * from "./anomaly.ts";
export * from "./attribution.ts";

export const ALL_RULES: readonly Rule[] = [
  unattributed,
  costBreak,
  jobsOnAllPurpose,
  noAutotermination,
  idleWarehouse,
  instanceMismatch,
];
