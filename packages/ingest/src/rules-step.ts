import type { Basis, IsoDate } from "@tare/core";
import { toIsoDate } from "@tare/core";
import type { TenantContext } from "@tare/db";
import {
  ALL_RULES,
  runRules,
  type Finding,
  type RateLookup,
  type Rule,
  type RuleInput,
  type UsageFact,
  type EntityConfig,
} from "@tare/rules";

const CAPABILITIES = new Set([
  "usage_daily",
  "cluster_config",
  "job_timeline",
  "query_history",
] as const);

/**
 * Runs the deterministic detection rules against the last 60 days of usage,
 * writes each finding as a `recommendation` row (or updates the impact of an
 * existing open one), and returns a per-rule outcome so the UI can show which
 * rules could not run for lack of capabilities.
 *
 * A rule's output is authoritative for that rule + entity: if the signal
 * disappears (impact drops to zero or below a threshold), the existing
 * recommendation is left alone — the customer decides when to close.
 */
export async function detectFindings(
  ctx: TenantContext,
  currency: "EUR" | "USD" = "EUR",
): Promise<{ ran: string[]; skipped: Array<{ rule: string; missing: string[] }>; findings: number }> {
  const asOf = toIsoDate(new Date());

  const [usage, configs] = await Promise.all([
    loadUsageFacts(ctx, 60),
    loadEntityConfigs(ctx),
  ]);

  const rates: RateLookup = () => ({ rateMinor: 0, basis: "estimated" });

  const input: RuleInput = { asOf, currency, usage, configs, rates };
  const outcomes = runRules(ALL_RULES as readonly Rule[], input, CAPABILITIES);

  const ran: string[] = [];
  const skipped: Array<{ rule: string; missing: string[] }> = [];
  let total = 0;

  for (const outcome of outcomes) {
    if (outcome.status === "skipped") {
      skipped.push({ rule: outcome.rule, missing: [...outcome.missing] });
      continue;
    }
    ran.push(outcome.rule);
    for (const finding of outcome.findings) {
      await upsertRecommendation(ctx, finding, currency);
      total++;
    }
  }

  return { ran, skipped, findings: total };
}

async function upsertRecommendation(
  ctx: TenantContext,
  f: Finding,
  currency: string,
): Promise<void> {
  const entityId = f.entityExternalId ? await lookupEntityId(ctx, f.entityExternalId) : null;

  // Try to update an existing OPEN recommendation for the same (rule, entity).
  // If none exists (or all are terminal), insert a fresh one.
  const upd = await ctx.query<{ id: string }>(
    `UPDATE recommendation
     SET impact_minor = $3, impact_basis = $4, explanation = $5
     WHERE tenant_id = $1
       AND rule = $2
       AND (entity_id = $6 OR (entity_id IS NULL AND $6 IS NULL))
       AND state IN ('open', 'accepted', 'applied', 'verifying')
     RETURNING id`,
    [ctx.tenantId, f.rule, f.impactMinor, f.impactBasis, f.explanation, entityId],
  );
  if (upd.rowCount && upd.rowCount > 0) return;

  await ctx.query(
    `INSERT INTO recommendation
       (tenant_id, rule, entity_id, impact_minor, impact_basis, currency, explanation)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [ctx.tenantId, f.rule, entityId, f.impactMinor, f.impactBasis, currency, f.explanation],
  );
}

async function lookupEntityId(ctx: TenantContext, externalId: string): Promise<string | null> {
  const res = await ctx.query<{ id: string }>(
    `SELECT id FROM entity WHERE tenant_id = $1 AND external_id = $2 LIMIT 1`,
    [ctx.tenantId, externalId],
  );
  return res.rows[0]?.id ?? null;
}

async function loadUsageFacts(ctx: TenantContext, days: number): Promise<UsageFact[]> {
  const res = await ctx.query<{
    usage_date: string;
    entity_external_id: string;
    entity_kind: "job" | "cluster" | "warehouse" | "pipeline" | "notebook";
    sku: string;
    dbus: number;
    cost_minor: number;
    cost_basis: Basis;
    has_owner: boolean;
  }>(
    `SELECT u.usage_date,
            e.external_id AS entity_external_id,
            e.kind AS entity_kind,
            u.sku,
            u.dbus::float8,
            u.cost_minor,
            u.cost_basis,
            (eo.owner_id IS NOT NULL) AS has_owner
     FROM usage_daily u
     JOIN entity e ON e.id = u.entity_id
     LEFT JOIN entity_owner eo ON eo.tenant_id = u.tenant_id AND eo.entity_id = u.entity_id
     WHERE u.tenant_id = $1
       AND u.usage_date >= (CURRENT_DATE - ($2 || ' days')::interval)`,
    [ctx.tenantId, days],
  );
  return res.rows.map((r) => ({
    usageDate: r.usage_date,
    entityExternalId: r.entity_external_id,
    entityKind: r.entity_kind,
    sku: r.sku,
    dbus: Number(r.dbus),
    costMinor: Number(r.cost_minor),
    costBasis: r.cost_basis,
    hasOwner: r.has_owner,
  }));
}

async function loadEntityConfigs(ctx: TenantContext): Promise<EntityConfig[]> {
  // For phase 1c we surface config as it stands on the entity table itself
  // (freshest observed). entity_config_daily will feed history when we start
  // versioning by date; for now, one config per entity is enough for the rules.
  const res = await ctx.query<{
    entity_external_id: string;
    observed_on: string;
    autotermination_minutes: number | null;
    node_type: string | null;
    min_workers: number | null;
    max_workers: number | null;
    runtime_version: string | null;
  }>(
    `SELECT e.external_id AS entity_external_id,
            e.last_seen::text AS observed_on,
            (c.autotermination_minutes)::int  AS autotermination_minutes,
            c.node_type,
            c.min_workers,
            c.max_workers,
            c.runtime_version
     FROM entity e
     LEFT JOIN LATERAL (
       SELECT autotermination_minutes, node_type, min_workers, max_workers, runtime_version
       FROM entity_config_daily
       WHERE tenant_id = $1 AND entity_id = e.id
       ORDER BY observed_on DESC
       LIMIT 1
     ) c ON true
     WHERE e.tenant_id = $1`,
    [ctx.tenantId],
  );
  return res.rows
    .filter((r) => r.node_type !== null || r.autotermination_minutes !== null)
    .map((r) => ({
      entityExternalId: r.entity_external_id,
      observedOn: r.observed_on,
      autoterminationMinutes: r.autotermination_minutes,
      nodeType: r.node_type,
      minWorkers: r.min_workers,
      maxWorkers: r.max_workers,
      runtimeVersion: r.runtime_version,
    }));
}
