import type { Capability, IsoDate, Money } from "@tare/core";
import { money } from "@tare/core";
import type { IngestBatch, Source } from "../source.ts";
import { classify, IngestError } from "../errors.ts";

const CAPABILITIES: ReadonlySet<Capability> = new Set([
  "usage_daily",
  "cluster_config",
  "job_timeline",
  "query_history",
]);

export type DatabricksConfig = {
  host: string;                    // adb-xxx.azuredatabricks.net
  clientId: string;
  clientSecret: string;            // never persisted, obtained via sealed store at call time
  warehouseId: string;
  currency: "EUR" | "USD";
};

export function databricksSource(cfg: DatabricksConfig): Source {
  return {
    name: "databricks",
    capabilities: CAPABILITIES,
    async *fetch(range) {
      const token = await getAccessToken(cfg);
      // Six aggregations, one warehouse wake. Bring rows out already grouped
      // by (day, entity, sku); never one row per event.
      const usage = await runAggregated(cfg, token, usageSql(range));
      const configs = await runAggregated(cfg, token, clusterConfigSql(range));

      yield {
        usage: usage.map((r) => toNormalizedUsage(r, cfg.currency)),
        configs: configs.map(toNormalizedConfig),
      } satisfies IngestBatch;
    },
  };
}

// ─── token cache (per-process, never persisted) ────────────────────────
type TokenCache = { value: string; expiresAt: number };
const tokenCache = new Map<string, TokenCache>();

async function getAccessToken(cfg: DatabricksConfig): Promise<string> {
  const key = `${cfg.host}:${cfg.clientId}`;
  const now = Date.now();
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt - 60_000 > now) return cached.value;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "all-apis",
  });
  const auth = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");

  try {
    const res = await fetch(`https://${cfg.host}/oidc/v1/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) throw new Error(`OAuth token endpoint returned ${res.status}`);
    const json = (await res.json()) as { access_token: string; expires_in: number };
    const value = json.access_token;
    const expiresAt = now + json.expires_in * 1000;
    tokenCache.set(key, { value, expiresAt });
    return value;
  } catch (err) {
    throw classify(err);
  }
}

// ─── SQL Statement Execution API (async mode + polling) ────────────────
type StatementResult = { rows: readonly (readonly unknown[])[]; columns: readonly string[] };

async function runAggregated(
  cfg: DatabricksConfig,
  token: string,
  statement: string,
): Promise<Array<Record<string, unknown>>> {
  const submit = await fetch(`https://${cfg.host}/api/2.0/sql/statements`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      warehouse_id: cfg.warehouseId,
      statement,
      wait_timeout: "10s",
      disposition: "EXTERNAL_LINKS",
      format: "JSON_ARRAY",
    }),
  });
  if (!submit.ok) {
    throw classify(new Error(`Statement submit failed: ${submit.status}`));
  }
  let payload = (await submit.json()) as StatementResponse;

  while (payload.status.state === "PENDING" || payload.status.state === "RUNNING") {
    await sleep(Math.min(2_000, 250 + Math.random() * 500));
    const poll = await fetch(
      `https://${cfg.host}/api/2.0/sql/statements/${payload.statement_id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!poll.ok) throw classify(new Error(`Statement poll failed: ${poll.status}`));
    payload = (await poll.json()) as StatementResponse;
  }

  if (payload.status.state !== "SUCCEEDED") {
    throw classify(
      new Error(payload.status.error?.message ?? `Statement ended in ${payload.status.state}`),
    );
  }

  const result = await materialize(payload);
  return result.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((c, i) => (obj[c] = row[i]));
    return obj;
  });
}

type StatementResponse = {
  statement_id: string;
  status: { state: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED"; error?: { message?: string } };
  manifest?: { schema: { columns: Array<{ name: string }> } };
  result?: {
    data_array?: (readonly unknown[])[];
    external_links?: Array<{ external_link: string }>;
  };
};

async function materialize(payload: StatementResponse): Promise<StatementResult> {
  const columns = payload.manifest?.schema.columns.map((c) => c.name) ?? [];
  if (payload.result?.data_array) {
    return { columns, rows: payload.result.data_array };
  }
  const rows: (readonly unknown[])[] = [];
  for (const link of payload.result?.external_links ?? []) {
    const chunk = await fetch(link.external_link);
    const arr = (await chunk.json()) as (readonly unknown[])[];
    rows.push(...arr);
  }
  return { columns, rows };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── SQL templates ─────────────────────────────────────────────────────
// One row per (day, entity, SKU). GROUP BY happens on their side.
function usageSql(range: { start: IsoDate; end: IsoDate }): string {
  return `
    SELECT
      usage_date,
      COALESCE(usage_metadata.job_id, usage_metadata.cluster_id,
               usage_metadata.warehouse_id, usage_metadata.dlt_pipeline_id,
               'unattributed') AS entity_external_id,
      CASE
        WHEN usage_metadata.job_id IS NOT NULL THEN 'job'
        WHEN usage_metadata.warehouse_id IS NOT NULL THEN 'warehouse'
        WHEN usage_metadata.dlt_pipeline_id IS NOT NULL THEN 'pipeline'
        WHEN usage_metadata.cluster_id IS NOT NULL THEN 'cluster'
        ELSE 'cluster'
      END AS entity_kind,
      sku_name,
      SUM(usage_quantity) AS dbus,
      SUM(usage_quantity * lp.pricing.default) AS list_cost,
      ANY_VALUE(identity_metadata.run_as) AS run_as,
      ANY_VALUE(custom_tags) AS tags
    FROM system.billing.usage u
    LEFT JOIN system.billing.list_prices lp
      ON lp.sku_name = u.sku_name
     AND u.usage_end_time BETWEEN lp.price_start_time
                              AND COALESCE(lp.price_end_time, TIMESTAMP '2999-01-01')
    WHERE usage_date BETWEEN DATE '${range.start}' AND DATE '${range.end}'
    GROUP BY 1,2,3,4
  `;
}

function clusterConfigSql(range: { start: IsoDate; end: IsoDate }): string {
  return `
    SELECT
      DATE(change_time) AS observed_on,
      cluster_id AS entity_external_id,
      'cluster' AS entity_kind,
      driver_node_type AS node_type,
      min_autoscale_workers AS min_workers,
      max_autoscale_workers AS max_workers,
      auto_termination_minutes AS autotermination_minutes,
      dbr_version AS runtime_version,
      custom_tags AS tags
    FROM system.compute.clusters
    WHERE DATE(change_time) BETWEEN DATE '${range.start}' AND DATE '${range.end}'
    QUALIFY ROW_NUMBER() OVER (
      PARTITION BY cluster_id, DATE(change_time)
      ORDER BY change_time DESC
    ) = 1
  `;
}

// ─── row → normalized ─────────────────────────────────────────────────
function toNormalizedUsage(r: Record<string, unknown>, currency: "EUR" | "USD") {
  const listCostMinor = Math.round(Number(r["list_cost"] ?? 0) * 100);
  const cost: Money = money(listCostMinor, currency, "estimated", String(r["usage_date"]));
  const tags = (r["tags"] ?? {}) as Record<string, string>;
  return {
    usageDate: String(r["usage_date"]),
    entityKind: String(r["entity_kind"]) as "cluster",
    entityExternalId: String(r["entity_external_id"]),
    entityName: String(r["entity_external_id"]),
    sku: String(r["sku_name"]),
    dbus: Number(r["dbus"] ?? 0),
    cost,
    listCostMinor,
    tags,
    runAs: (r["run_as"] as string | null) ?? null,
    creator: null,
  };
}

function toNormalizedConfig(r: Record<string, unknown>) {
  return {
    observedOn: String(r["observed_on"]),
    entityKind: String(r["entity_kind"]) as "cluster",
    entityExternalId: String(r["entity_external_id"]),
    nodeType: (r["node_type"] as string | null) ?? null,
    minWorkers: (r["min_workers"] as number | null) ?? null,
    maxWorkers: (r["max_workers"] as number | null) ?? null,
    autoterminationMinutes: (r["autotermination_minutes"] as number | null) ?? null,
    runtimeVersion: (r["runtime_version"] as string | null) ?? null,
    tags: ((r["tags"] as Record<string, string>) ?? {}),
    raw: r,
  };
}

export { IngestError };
