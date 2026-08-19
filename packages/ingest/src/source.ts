import type { Capability, IsoDate, Money } from "@tare/core";

export type NormalizedUsage = {
  usageDate: IsoDate;
  entityKind: "job" | "cluster" | "warehouse" | "pipeline" | "notebook";
  entityExternalId: string;
  entityName: string;
  sku: string;
  dbus: number;
  cost: Money;
  listCostMinor: number;
  tags: Readonly<Record<string, string>>;
  runAs: string | null;
  creator: string | null;
};

export type NormalizedEntityConfig = {
  observedOn: IsoDate;
  entityKind: "job" | "cluster" | "warehouse" | "pipeline" | "notebook";
  entityExternalId: string;
  nodeType: string | null;
  minWorkers: number | null;
  maxWorkers: number | null;
  autoterminationMinutes: number | null;
  runtimeVersion: string | null;
  tags: Readonly<Record<string, string>>;
  raw: unknown;
};

export type IngestBatch = {
  readonly usage: readonly NormalizedUsage[];
  readonly configs: readonly NormalizedEntityConfig[];
};

/**
 * A source of usage. Given a date range, yields normalized batches.
 * Streams so we never hold a whole backfill in memory.
 */
export type Source = {
  readonly name: string;
  readonly capabilities: ReadonlySet<Capability>;
  fetch(range: { start: IsoDate; end: IsoDate }): AsyncIterable<IngestBatch>;
};
