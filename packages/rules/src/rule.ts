import type { Basis, Capability, CapabilitySet, IsoDate } from "@tare/core";

export type Finding = {
  readonly rule: string;
  readonly entityExternalId: string | null;
  readonly kind: "cost" | "change" | "share";
  readonly impactMinor: number | null;    // null when kind = 'share'
  readonly impactBasis: Basis | null;
  readonly currency: string;
  readonly explanation: string;
  readonly openedOn: IsoDate;
};

export type RuleInput = {
  readonly asOf: IsoDate;
  readonly currency: string;
  readonly usage: readonly UsageFact[];
  readonly configs: readonly EntityConfig[];
  readonly rates: RateLookup;
};

export type UsageFact = {
  readonly usageDate: IsoDate;
  readonly entityExternalId: string;
  readonly entityKind: "job" | "cluster" | "warehouse" | "pipeline" | "notebook";
  readonly sku: string;
  readonly dbus: number;
  readonly costMinor: number;
  readonly costBasis: Basis;
  readonly hasOwner: boolean;
};

export type EntityConfig = {
  readonly entityExternalId: string;
  readonly observedOn: IsoDate;
  readonly autoterminationMinutes: number | null;
  readonly nodeType: string | null;
  readonly minWorkers: number | null;
  readonly maxWorkers: number | null;
  readonly runtimeVersion: string | null;
};

export type RateLookup = (sku: string, on: IsoDate) => { rateMinor: number; basis: Basis };

export type Rule = {
  readonly id: string;
  readonly title: string;
  readonly requires: readonly Capability[];
  run(input: RuleInput): Iterable<Finding>;
};

export type RuleOutcome =
  | { rule: string; status: "ran"; findings: readonly Finding[] }
  | { rule: string; status: "skipped"; missing: readonly Capability[] };

export function runRules(
  rules: readonly Rule[],
  input: RuleInput,
  capabilities: CapabilitySet,
): RuleOutcome[] {
  return rules.map((rule) => {
    const missing = rule.requires.filter((c) => !capabilities.has(c));
    if (missing.length > 0) return { rule: rule.id, status: "skipped", missing };
    return { rule: rule.id, status: "ran", findings: Array.from(rule.run(input)) };
  });
}
