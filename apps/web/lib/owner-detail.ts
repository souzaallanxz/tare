import type { Basis } from "@tare/core";
import { withTenant } from "@tare/db";

export type OwnerDetail = {
  ownerId: string | null;                 // null = unattributed
  name: string;
  totalMinor: number;
  currency: "EUR" | "USD";
  daily: { date: string; costMinor: number }[];
  entities: { id: string; name: string; kind: string; costMinor: number; basis: Basis }[];
  findings: {
    id: string;
    rule: string;
    entityName: string | null;
    state: string;
    impactMinor: number | null;
    impactBasis: Basis | null;
  }[];
} | null;

const RANGE_DAYS = 60;

export async function getOwnerDetail(
  tenantId: string,
  ownerParam: string,
): Promise<OwnerDetail> {
  const unattributed = ownerParam === "unattr";
  return withTenant(tenantId, async (ctx) => {
    let name = "Unattributed";
    let ownerId: string | null = null;
    if (!unattributed) {
      const res = await ctx.query<{ id: string; name: string }>(
        `SELECT id, name FROM owner WHERE tenant_id = $1 AND id = $2`,
        [ctx.tenantId, ownerParam],
      );
      if (res.rows.length === 0) return null;
      ownerId = res.rows[0]!.id;
      name = res.rows[0]!.name;
    }

    const dailyRes = await ctx.query<{ usage_date: string; cost_minor: number; currency: string }>(
      `SELECT usage_date::text AS usage_date,
              cost_minor::bigint AS cost_minor,
              currency
       FROM rollup_daily_owner
       WHERE tenant_id = $1
         AND owner_id ${ownerId === null ? "IS NULL" : "= $2"}
         AND usage_date >= (CURRENT_DATE - ($${ownerId === null ? "2" : "3"} || ' days')::interval)
       ORDER BY usage_date`,
      ownerId === null
        ? [ctx.tenantId, RANGE_DAYS]
        : [ctx.tenantId, ownerId, RANGE_DAYS],
    );
    const daily = dailyRes.rows.map((r) => ({
      date: r.usage_date,
      costMinor: Number(r.cost_minor),
    }));
    const totalMinor = daily.reduce((s, d) => s + d.costMinor, 0);
    const currency = (dailyRes.rows[0]?.currency ?? "EUR") as "EUR" | "USD";

    const entRes = await ctx.query<{
      id: string;
      name: string;
      kind: string;
      cost: number;
      basis: Basis;
    }>(
      `SELECT e.id, e.name, e.kind::text AS kind,
              COALESCE(SUM(u.cost_minor), 0)::bigint AS cost,
              CASE WHEN bool_or(u.cost_basis='estimated') THEN 'estimated' ELSE 'billed' END::basis AS basis
       FROM entity e
       LEFT JOIN entity_owner eo ON eo.tenant_id = e.tenant_id AND eo.entity_id = e.id
       LEFT JOIN usage_daily u
         ON u.tenant_id = e.tenant_id AND u.entity_id = e.id
         AND u.usage_date >= (CURRENT_DATE - ($${ownerId === null ? "2" : "3"} || ' days')::interval)
       WHERE e.tenant_id = $1
         AND ${ownerId === null ? "eo.owner_id IS NULL" : "eo.owner_id = $2"}
       GROUP BY e.id, e.name, e.kind
       ORDER BY cost DESC`,
      ownerId === null
        ? [ctx.tenantId, RANGE_DAYS]
        : [ctx.tenantId, ownerId, RANGE_DAYS],
    );
    const entities = entRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      costMinor: Number(r.cost),
      basis: r.basis,
    }));

    const findRes = await ctx.query<{
      id: string;
      rule: string;
      entity_name: string | null;
      state: string;
      impact_minor: number | null;
      impact_basis: Basis | null;
    }>(
      `SELECT r.id, r.rule, e.name AS entity_name, r.state::text AS state,
              r.impact_minor, r.impact_basis::text AS impact_basis
       FROM recommendation r
       LEFT JOIN entity e ON e.id = r.entity_id
       LEFT JOIN entity_owner eo ON eo.tenant_id = r.tenant_id AND eo.entity_id = r.entity_id
       WHERE r.tenant_id = $1
         AND ${ownerId === null ? "eo.owner_id IS NULL" : "eo.owner_id = $2"}
       ORDER BY COALESCE(r.impact_minor, 0) DESC
       LIMIT 20`,
      ownerId === null ? [ctx.tenantId] : [ctx.tenantId, ownerId],
    );
    const findings = findRes.rows.map((r) => ({
      id: r.id,
      rule: r.rule,
      entityName: r.entity_name,
      state: r.state,
      impactMinor: r.impact_minor === null ? null : Number(r.impact_minor),
      impactBasis: r.impact_basis,
    }));

    return { ownerId, name, totalMinor, currency, daily, entities, findings };
  });
}
