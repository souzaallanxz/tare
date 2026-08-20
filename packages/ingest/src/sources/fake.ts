import type { Capability, IsoDate, Money } from "@tare/core";
import { addDays, money, parseIsoDate } from "@tare/core";
import type { IngestBatch, Source } from "../source.ts";

const CAPABILITIES: ReadonlySet<Capability> = new Set([
  "usage_daily",
  "cluster_config",
  "job_timeline",
  "query_history",
]);

/**
 * Deterministic synthetic source for development without a real Databricks
 * workspace. Given a date range, yields the same numbers every time so tests
 * and demos are reproducible.
 *
 * Never registered as a real ingestion path in production. The caller decides
 * whether to use this or databricksSource — the pipeline itself is source-blind.
 */
export function fakeSource(opts: { currency?: "EUR" | "USD"; seed?: number } = {}): Source {
  const currency = opts.currency ?? "EUR";
  const seed = opts.seed ?? 42;
  return {
    name: "fake_databricks",
    capabilities: CAPABILITIES,
    async *fetch(range) {
      const entities: Array<{ name: string; kind: "job" | "cluster" | "warehouse"; sku: string; baseDbus: number; tags: Record<string, string> }> = [
        { name: "nightly-ingest",     kind: "job",       sku: "JOBS_COMPUTE", baseDbus: 400, tags: { team: "platform", env: "prod" } },
        { name: "ad-hoc-sql",         kind: "warehouse", sku: "SQL_PRO",      baseDbus: 180, tags: {} },
        { name: "shared-interactive", kind: "cluster",   sku: "ALL_PURPOSE",  baseDbus: 100, tags: {} },
        { name: "bi-refresh",         kind: "job",       sku: "JOBS_COMPUTE", baseDbus: 150, tags: { team: "analytics" } },
        { name: "ml-training",        kind: "job",       sku: "GPU_ML",       baseDbus:  40, tags: { team: "ds" } },
      ];

      const usage = [];
      for (let day = range.start; day <= range.end; day = addDays(day, 1)) {
        for (const e of entities) {
          const dbus = e.baseDbus * jitter(seed, day, e.name);
          const listCostMinor = Math.round(dbus * rate(e.sku) * 100);
          const cost: Money = money(listCostMinor, currency, "estimated", day);
          usage.push({
            usageDate: day,
            entityKind: e.kind,
            entityExternalId: e.name,
            entityName: e.name,
            sku: e.sku,
            dbus,
            cost,
            listCostMinor,
            tags: e.tags,
            runAs: e.tags["team"] ? `${e.tags["team"]}@example.com` : null,
            creator: null,
          });
        }
      }

      const configs = entities
        .filter((e) => e.kind === "cluster")
        .map((e) => ({
          observedOn: range.end,
          entityKind: e.kind,
          entityExternalId: e.name,
          nodeType: "Standard_D8ads_v5",
          minWorkers: 2,
          maxWorkers: 8,
          autoterminationMinutes: e.name === "shared-interactive" ? null : 10,
          runtimeVersion: "15.4 LTS",
          tags: e.tags,
          raw: e,
        }));

      yield { usage, configs } satisfies IngestBatch;
    },
  };
}

function rate(sku: string): number {
  // Same order of magnitude as real DBU rates, but not calibrated to anything.
  switch (sku) {
    case "JOBS_COMPUTE": return 0.30;
    case "SQL_PRO":      return 0.55;
    case "ALL_PURPOSE":  return 0.55;
    case "GPU_ML":       return 2.10;
    default:             return 0.40;
  }
}

// Cheap deterministic pseudo-random in [0.8, 1.2].
function jitter(seed: number, day: IsoDate, entity: string): number {
  const key = `${seed}:${day}:${entity}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const dayIdx = parseIsoDate(day).getUTCDay();
  const weekend = dayIdx === 0 || dayIdx === 6 ? 0.35 : 1;
  return weekend * (0.8 + ((h >>> 0) % 400) / 1000);
}
