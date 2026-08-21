import type { AttributionSource, EntityKind } from "@tare/core";
import type { TenantContext } from "../tenant-context.ts";

// ─────────────────────────── owner ─────────────────────────────
export type Owner = {
  id: string;
  name: string;
  kind: "team" | "person";
};

export async function listOwners(ctx: TenantContext): Promise<Owner[]> {
  const res = await ctx.query<Owner>(
    `SELECT id, name, kind FROM owner WHERE tenant_id = $1 ORDER BY name`,
    [ctx.tenantId],
  );
  return res.rows;
}

export async function ensureOwner(
  ctx: TenantContext,
  name: string,
  kind: "team" | "person",
): Promise<Owner> {
  const res = await ctx.query<Owner>(
    `INSERT INTO owner (tenant_id, name, kind) VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, name) DO UPDATE SET kind = EXCLUDED.kind
     RETURNING id, name, kind`,
    [ctx.tenantId, name, kind],
  );
  return res.rows[0]!;
}

export type OwnerSpend = {
  ownerId: string | null;
  name: string;
  spendMinor: number;
  entities: number;
  dbus: number;
  costPerDbuMinor: number | null;
};

/** Owner totals for a window. Uses the same rollup the Overview reads. */
export async function ownerSpendBetween(
  ctx: TenantContext,
  start: string,
  end: string,
): Promise<OwnerSpend[]> {
  const res = await ctx.query<{
    owner_id: string | null;
    name: string;
    spend: number;
    entities: number;
    dbus: number;
  }>(
    `WITH totals AS (
       SELECT r.owner_id, SUM(r.cost_minor)::bigint AS spend
       FROM rollup_daily_owner r
       WHERE r.tenant_id = $1 AND r.usage_date BETWEEN $2 AND $3
       GROUP BY r.owner_id
     ),
     ent AS (
       SELECT eo.owner_id, COUNT(DISTINCT eo.entity_id)::int AS entities
       FROM entity_owner eo
       WHERE eo.tenant_id = $1
       GROUP BY eo.owner_id
     ),
     dbu AS (
       SELECT eo.owner_id, SUM(u.dbus)::float8 AS dbus
       FROM usage_daily u
       LEFT JOIN entity_owner eo
         ON eo.tenant_id = u.tenant_id AND eo.entity_id = u.entity_id
       WHERE u.tenant_id = $1 AND u.usage_date BETWEEN $2 AND $3
       GROUP BY eo.owner_id
     )
     SELECT t.owner_id,
            COALESCE(o.name, 'Unattributed') AS name,
            t.spend,
            COALESCE(e.entities, 0) AS entities,
            COALESCE(d.dbus, 0)::float8 AS dbus
     FROM totals t
     LEFT JOIN owner o ON o.id = t.owner_id
     LEFT JOIN ent   e ON e.owner_id IS NOT DISTINCT FROM t.owner_id
     LEFT JOIN dbu   d ON d.owner_id IS NOT DISTINCT FROM t.owner_id
     ORDER BY t.spend DESC`,
    [ctx.tenantId, start, end],
  );
  return res.rows.map((r) => {
    const dbus = Number(r.dbus);
    const spend = Number(r.spend);
    return {
      ownerId: r.owner_id,
      name: r.name,
      spendMinor: spend,
      entities: r.entities,
      dbus,
      costPerDbuMinor: dbus > 0 ? Math.round(spend / dbus) : null,
    };
  });
}

// ─────────────────────── attribution rules ─────────────────────
export type Matcher =
  | { type: "tag"; key: string; value: string }
  | { type: "run_as_domain"; domain: string }
  | { type: "run_as_equals"; email: string }
  | { type: "creator"; user: string }
  | { type: "warehouse_id"; id: string };

export type AttributionRule = {
  id: string;
  priority: number;
  matcher: Matcher;
  ownerId: string;
  ownerName: string;
  active: boolean;
};

export async function listAttributionRules(ctx: TenantContext): Promise<AttributionRule[]> {
  const res = await ctx.query<{
    id: string;
    priority: number;
    matcher: Matcher;
    owner_id: string;
    owner_name: string;
    active: boolean;
  }>(
    `SELECT r.id, r.priority, r.matcher, r.owner_id, o.name AS owner_name, r.active
     FROM attribution_rule r
     JOIN owner o ON o.id = r.owner_id
     WHERE r.tenant_id = $1
     ORDER BY r.priority`,
    [ctx.tenantId],
  );
  return res.rows.map((r) => ({
    id: r.id,
    priority: r.priority,
    matcher: r.matcher,
    ownerId: r.owner_id,
    ownerName: r.owner_name,
    active: r.active,
  }));
}

export async function createAttributionRule(
  ctx: TenantContext,
  input: { priority: number; matcher: Matcher; ownerId: string },
): Promise<string> {
  const res = await ctx.query<{ id: string }>(
    `INSERT INTO attribution_rule (tenant_id, priority, matcher, owner_id, active)
     VALUES ($1, $2, $3::jsonb, $4, true)
     RETURNING id`,
    [ctx.tenantId, input.priority, JSON.stringify(input.matcher), input.ownerId],
  );
  return res.rows[0]!.id;
}

export async function deleteAttributionRule(ctx: TenantContext, id: string): Promise<void> {
  await ctx.query(
    `DELETE FROM attribution_rule WHERE tenant_id = $1 AND id = $2`,
    [ctx.tenantId, id],
  );
}

export async function nextRulePriority(ctx: TenantContext): Promise<number> {
  const res = await ctx.query<{ max: number | null }>(
    `SELECT MAX(priority) AS max FROM attribution_rule WHERE tenant_id = $1`,
    [ctx.tenantId],
  );
  return (res.rows[0]?.max ?? 0) + 1;
}

// ─────────────────────── entity ↔ owner ────────────────────────
export type EntitySignal = {
  entityId: string;
  entityKind: EntityKind;
  entityExternalId: string;
  entityName: string;
  tags: Readonly<Record<string, string>>;
  runAs: string | null;
  creator: string | null;
  warehouseId: string | null;
};

/**
 * Aggregates the observable signals for every entity currently in the tenant.
 * Uses the freshest tags/run_as it can find in the last 30 days of usage,
 * plus creator from entity_config_daily.
 */
export async function entitySignals(ctx: TenantContext): Promise<EntitySignal[]> {
  const res = await ctx.query<{
    entity_id: string;
    kind: EntityKind;
    external_id: string;
    name: string;
    tags: Record<string, string> | null;
    run_as: string | null;
    creator: string | null;
  }>(
    `SELECT id AS entity_id, kind, external_id, name, tags, run_as, creator
     FROM entity
     WHERE tenant_id = $1`,
    [ctx.tenantId],
  );
  return res.rows.map((r) => ({
    entityId: r.entity_id,
    entityKind: r.kind,
    entityExternalId: r.external_id,
    entityName: r.name,
    tags: r.tags ?? {},
    runAs: r.run_as,
    creator: r.creator,
    warehouseId: r.kind === "warehouse" ? r.external_id : null,
  }));
}

export async function replaceEntityOwners(
  ctx: TenantContext,
  assignments: readonly {
    entityId: string;
    ownerId: string | null;
    source: AttributionSource | null;
  }[],
): Promise<void> {
  if (assignments.length === 0) return;
  await ctx.query(
    `DELETE FROM entity_owner
     WHERE tenant_id = $1
       AND entity_id = ANY($2::uuid[])
       AND source IS DISTINCT FROM 'manual'`,
    [ctx.tenantId, assignments.map((a) => a.entityId)],
  );
  const values: unknown[] = [];
  const tuples = assignments
    .filter((a) => a.source !== "manual")
    .map((a, i) => {
      const p = i * 4;
      values.push(ctx.tenantId, a.entityId, a.ownerId, a.source);
      return `($${p + 1}, $${p + 2}, $${p + 3}, $${p + 4}::attribution_source, now())`;
    });
  if (tuples.length === 0) return;
  await ctx.query(
    `INSERT INTO entity_owner (tenant_id, entity_id, owner_id, source, resolved_at)
     VALUES ${tuples.join(", ")}
     ON CONFLICT (tenant_id, entity_id) DO UPDATE SET
       owner_id = EXCLUDED.owner_id,
       source = EXCLUDED.source,
       resolved_at = EXCLUDED.resolved_at`,
    values,
  );
}

export async function setManualOwner(
  ctx: TenantContext,
  entityId: string,
  ownerId: string,
): Promise<void> {
  await ctx.query(
    `INSERT INTO entity_owner (tenant_id, entity_id, owner_id, source, resolved_at)
     VALUES ($1, $2, $3, 'manual', now())
     ON CONFLICT (tenant_id, entity_id) DO UPDATE SET
       owner_id = EXCLUDED.owner_id,
       source = 'manual',
       resolved_at = now()`,
    [ctx.tenantId, entityId, ownerId],
  );
}
