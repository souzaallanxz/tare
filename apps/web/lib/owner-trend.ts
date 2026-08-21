import { withTenant } from "@tare/db";

export type OwnerTrendPoint = { date: string; [owner: string]: number | string };

export type OwnerTrend = {
  days: OwnerTrendPoint[];
  ownerNames: string[];         // ordered top→bottom
  currency: "EUR" | "USD";
};

const RANGE_DAYS = 30;
const TOP_N = 5;

export async function getOwnerTrend(tenantId: string): Promise<OwnerTrend> {
  return withTenant(tenantId, async (ctx) => {
    const res = await ctx.query<{
      usage_date: string;
      owner_name: string;    // COALESCE below never returns NULL
      cost: number;
      currency: string;
    }>(
      `SELECT r.usage_date::text AS usage_date,
              COALESCE(o.name, 'Unattributed') AS owner_name,
              r.cost_minor::bigint AS cost,
              r.currency
       FROM rollup_daily_owner r
       LEFT JOIN owner o ON o.id = r.owner_id
       WHERE r.tenant_id = $1
         AND r.usage_date >= (CURRENT_DATE - ($2 || ' days')::interval)
       ORDER BY r.usage_date`,
      [ctx.tenantId, RANGE_DAYS],
    );

    const totals = new Map<string, number>();
    for (const row of res.rows) {
      totals.set(row.owner_name, (totals.get(row.owner_name) ?? 0) + Number(row.cost));
    }

    const ordered = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const top = ordered.slice(0, TOP_N).map(([n]) => n);
    const isOther = new Set(ordered.slice(TOP_N).map(([n]) => n));
    const ownerNames = isOther.size > 0 ? [...top, "Other"] : top;

    const byDate = new Map<string, OwnerTrendPoint>();
    for (const row of res.rows) {
      let point = byDate.get(row.usage_date);
      if (!point) {
        point = { date: row.usage_date };
        for (const n of ownerNames) point[n] = 0;
        byDate.set(row.usage_date, point);
      }
      const bucket = isOther.has(row.owner_name) ? "Other" : row.owner_name;
      point[bucket] = (Number(point[bucket] ?? 0)) + Number(row.cost) / 100;
    }

    return {
      days: [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1)),
      ownerNames,
      currency: (res.rows[0]?.currency ?? "EUR") as "EUR" | "USD",
    };
  });
}
