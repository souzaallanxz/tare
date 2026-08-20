import type { Basis, EntityKind, IsoDate } from "@tare/core";
import { withTenant } from "@tare/db";

export type WorkloadEntity = {
  id: string;
  kind: EntityKind;
  externalId: string;
  name: string;
  firstSeen: IsoDate;
  lastSeen: IsoDate;
  ownerName: string | null;
  ownerSource: string | null;
};

export type WorkloadConfig = {
  observedOn: IsoDate;
  nodeType: string | null;
  minWorkers: number | null;
  maxWorkers: number | null;
  autoterminationMinutes: number | null;
  runtimeVersion: string | null;
  tags: Readonly<Record<string, string>>;
} | null;

export type WorkloadDaily = {
  date: IsoDate;
  costMinor: number;
  basis: Basis;
};

export type WorkloadFinding = {
  id: string;
  rule: string;
  state: string;
  impactMinor: number | null;
  impactBasis: Basis | null;
  currency: string;
  explanation: string;
  openedAt: string;
};

export type WorkloadData = {
  entity: WorkloadEntity;
  config: WorkloadConfig;
  daily: WorkloadDaily[];
  totalMinor: number;
  currency: "EUR" | "USD";
  findings: WorkloadFinding[];
  workspaceTotalMinor: number;
} | null;

export async function getWorkloadByExternalId(
  tenantId: string,
  externalId: string,
): Promise<WorkloadData> {
  return withTenant(tenantId, async (ctx) => {
    const ent = await ctx.query<{
      id: string;
      kind: EntityKind;
      external_id: string;
      name: string;
      first_seen: string;
      last_seen: string;
      owner_name: string | null;
      owner_source: string | null;
    }>(
      `SELECT e.id, e.kind, e.external_id, e.name,
              e.first_seen::text AS first_seen, e.last_seen::text AS last_seen,
              o.name AS owner_name,
              eo.source::text AS owner_source
       FROM entity e
       LEFT JOIN entity_owner eo ON eo.tenant_id = e.tenant_id AND eo.entity_id = e.id
       LEFT JOIN owner o ON o.id = eo.owner_id
       WHERE e.tenant_id = $1 AND e.external_id = $2
       ORDER BY e.last_seen DESC
       LIMIT 1`,
      [ctx.tenantId, externalId],
    );
    const row = ent.rows[0];
    if (!row) return null;

    const entity: WorkloadEntity = {
      id: row.id,
      kind: row.kind,
      externalId: row.external_id,
      name: row.name,
      firstSeen: row.first_seen,
      lastSeen: row.last_seen,
      ownerName: row.owner_name,
      ownerSource: row.owner_source,
    };

    const dailyRes = await ctx.query<{
      usage_date: string;
      cost_minor: number;
      cost_basis: Basis;
      currency: string;
    }>(
      `SELECT usage_date::text AS usage_date,
              SUM(cost_minor)::bigint AS cost_minor,
              CASE WHEN bool_or(cost_basis = 'estimated') THEN 'estimated' ELSE 'billed' END::basis AS cost_basis,
              MAX(currency) AS currency
       FROM usage_daily
       WHERE tenant_id = $1 AND entity_id = $2
         AND usage_date >= (CURRENT_DATE - INTERVAL '30 days')
       GROUP BY usage_date
       ORDER BY usage_date`,
      [ctx.tenantId, entity.id],
    );
    const daily = dailyRes.rows.map((r) => ({
      date: r.usage_date,
      costMinor: Number(r.cost_minor),
      basis: r.cost_basis,
    }));
    const totalMinor = daily.reduce((s, d) => s + d.costMinor, 0);
    const currency = (dailyRes.rows[0]?.currency ?? "EUR") as "EUR" | "USD";

    const cfgRes = await ctx.query<{
      observed_on: string;
      node_type: string | null;
      min_workers: number | null;
      max_workers: number | null;
      autotermination_minutes: number | null;
      runtime_version: string | null;
      tags: Record<string, string> | null;
    }>(
      `SELECT observed_on::text AS observed_on, node_type, min_workers, max_workers,
              autotermination_minutes, runtime_version, tags
       FROM entity_config_daily
       WHERE tenant_id = $1 AND entity_id = $2
       ORDER BY observed_on DESC
       LIMIT 1`,
      [ctx.tenantId, entity.id],
    );
    const cfg = cfgRes.rows[0];
    const config: WorkloadConfig = cfg
      ? {
          observedOn: cfg.observed_on,
          nodeType: cfg.node_type,
          minWorkers: cfg.min_workers,
          maxWorkers: cfg.max_workers,
          autoterminationMinutes: cfg.autotermination_minutes,
          runtimeVersion: cfg.runtime_version,
          tags: cfg.tags ?? {},
        }
      : null;

    const findingsRes = await ctx.query<{
      id: string;
      rule: string;
      state: string;
      impact_minor: number | null;
      impact_basis: Basis | null;
      currency: string;
      explanation: string;
      opened_at: Date;
    }>(
      `SELECT id, rule, state::text AS state, impact_minor,
              impact_basis::text AS impact_basis, currency, explanation, opened_at
       FROM recommendation
       WHERE tenant_id = $1 AND entity_id = $2
       ORDER BY opened_at DESC`,
      [ctx.tenantId, entity.id],
    );
    const findings = findingsRes.rows.map((r) => ({
      id: r.id,
      rule: r.rule,
      state: r.state,
      impactMinor: r.impact_minor === null ? null : Number(r.impact_minor),
      impactBasis: r.impact_basis,
      currency: r.currency,
      explanation: r.explanation,
      openedAt: r.opened_at.toISOString(),
    }));

    const wsRes = await ctx.query<{ total: number }>(
      `SELECT COALESCE(SUM(cost_minor), 0)::bigint AS total
       FROM rollup_daily_workspace
       WHERE tenant_id = $1
         AND usage_date >= (CURRENT_DATE - INTERVAL '30 days')`,
      [ctx.tenantId],
    );

    return {
      entity,
      config,
      daily,
      totalMinor,
      currency,
      findings,
      workspaceTotalMinor: Number(wsRes.rows[0]?.total ?? 0),
    };
  });
}
