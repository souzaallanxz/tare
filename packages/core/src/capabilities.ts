/**
 * Capabilities declared by a source. Rules require capabilities;
 * the engine skips rules whose requirements are not met and shows the reason.
 */
export const CAPABILITIES = [
  "usage_daily",
  "cluster_config",
  "job_timeline",
  "query_history",
  "audit_log",
  "rate_card",
  "cloud_billing",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export type CapabilitySet = ReadonlySet<Capability>;

export function hasAll(set: CapabilitySet, required: readonly Capability[]): boolean {
  for (const c of required) if (!set.has(c)) return false;
  return true;
}

export function missing(set: CapabilitySet, required: readonly Capability[]): Capability[] {
  return required.filter((c) => !set.has(c));
}
