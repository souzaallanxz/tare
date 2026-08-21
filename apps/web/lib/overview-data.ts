import { withTenant } from "@tare/db";
import type { Basis } from "@tare/core";
import { FIXTURE } from "./fixtures";

export type OverviewData = {
  source: "real" | "fixture";
  workspace: string;
  ingestedAt: string;
  currency: "EUR" | "USD";
  billedMinor: number;
  forecastMinor: number;
  budgetMinor: number;
  unattributedMinor: number;
  unattributedPct: number;
  dailyMinor: number[];              // one entry per day of the current month, forecast tail included
  billedDays: number;
  dbusTotal: number;                 // sum of DBUs consumed to date
  costPerDbuMinor: number | null;    // blended rate, minor units
  previousMonthMinor: number;        // same-days-elapsed cost in the prior month
  monthOverMonthPct: number | null;  // (current − prev) / prev × 100
  weekOverWeekPct: number | null;    // last 7 vs prior 7
};

export async function getOverviewData(tenantId: string): Promise<OverviewData> {
  return withTenant(tenantId, async (ctx) => {
    const runRes = await ctx.query<{ finished_at: Date | null; window_end: string }>(
      `SELECT finished_at, window_end
       FROM ingest_run
       WHERE tenant_id = $1 AND status = 'succeeded'
       ORDER BY finished_at DESC NULLS LAST
       LIMIT 1`,
      [ctx.tenantId],
    );
    const lastRun = runRes.rows[0];
    if (!lastRun) return fixtureOverview();

    const anchor = new Date(`${lastRun.window_end}T00:00:00Z`);
    const monthStart = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));
    const startIso = monthStart.toISOString().slice(0, 10);
    const endIso = monthEnd.toISOString().slice(0, 10);

    const daily = await ctx.query<{ usage_date: string; cost_minor: number; cost_basis: Basis; currency: string }>(
      `SELECT usage_date, cost_minor, cost_basis, currency
       FROM rollup_daily_workspace
       WHERE tenant_id = $1 AND usage_date BETWEEN $2 AND $3
       ORDER BY usage_date`,
      [ctx.tenantId, startIso, endIso],
    );

    if (daily.rows.length === 0) return fixtureOverview();

    const currency = (daily.rows[0]!.currency as "EUR" | "USD");
    const days = daysBetween(monthStart, monthEnd);
    const dailyMinor = new Array<number>(days).fill(0);
    let billedMinor = 0;
    let billedDays = 0;

    for (const r of daily.rows) {
      const idx = daysBetween(monthStart, new Date(`${r.usage_date}T00:00:00Z`)) - 1;
      if (idx >= 0 && idx < days) dailyMinor[idx] = r.cost_minor;
      billedMinor += r.cost_minor;
      billedDays = Math.max(billedDays, idx + 1);
    }

    // Forecast the remainder as same-weekday trailing 4-week mean of what we have.
    const historyRes = await ctx.query<{ usage_date: string; cost_minor: number }>(
      `SELECT usage_date, cost_minor
       FROM rollup_daily_workspace
       WHERE tenant_id = $1 AND usage_date < $2
       ORDER BY usage_date DESC
       LIMIT 60`,
      [ctx.tenantId, endIso],
    );
    const byWeekday = new Map<number, number[]>();
    for (const r of [...historyRes.rows, ...daily.rows]) {
      const w = new Date(`${r.usage_date}T00:00:00Z`).getUTCDay();
      if (!byWeekday.has(w)) byWeekday.set(w, []);
      byWeekday.get(w)!.push(r.cost_minor);
    }

    let forecastRemainingMinor = 0;
    for (let i = billedDays; i < days; i++) {
      const d = new Date(monthStart);
      d.setUTCDate(monthStart.getUTCDate() + i);
      const bucket = byWeekday.get(d.getUTCDay()) ?? [];
      const last = bucket.slice(-4);
      const mean = last.length ? last.reduce((s, v) => s + v, 0) / last.length : 0;
      const rounded = Math.round(mean);
      dailyMinor[i] = rounded;
      forecastRemainingMinor += rounded;
    }

    // Unattributed share for the same window.
    const unattr = await ctx.query<{ cost: number; total: number }>(
      `SELECT
         COALESCE(SUM(CASE WHEN owner_id IS NULL THEN cost_minor END), 0)::bigint AS cost,
         COALESCE(SUM(cost_minor), 0)::bigint AS total
       FROM rollup_daily_owner
       WHERE tenant_id = $1 AND usage_date BETWEEN $2 AND $3`,
      [ctx.tenantId, startIso, endIso],
    );
    const unattrRow = unattr.rows[0]!;
    const unattributedPct = unattrRow.total > 0 ? (unattrRow.cost / unattrRow.total) * 100 : 0;

    // Budget
    const budget = await ctx.query<{ limit_minor: number }>(
      `SELECT limit_minor FROM budget
       WHERE tenant_id = $1 AND scope @> '{"type":"workspace"}'::jsonb AND period = 'monthly'
       LIMIT 1`,
      [ctx.tenantId],
    );
    const budgetMinor = budget.rows[0]?.limit_minor ?? Math.max(70_000_00, Math.round(billedMinor * 1.4));

    // DBUs total for the month so far — usage_daily grouped, ignores rollup.
    const dbusRes = await ctx.query<{ dbus: number }>(
      `SELECT COALESCE(SUM(dbus), 0)::float8 AS dbus
       FROM usage_daily
       WHERE tenant_id = $1 AND usage_date BETWEEN $2 AND $3`,
      [ctx.tenantId, startIso, endIso],
    );
    const dbusTotal = Number(dbusRes.rows[0]?.dbus ?? 0);
    const costPerDbuMinor = dbusTotal > 0 ? Math.round(billedMinor / dbusTotal) : null;

    // Previous month, same number of days elapsed — apples to apples.
    const prevMonthStart = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 1, 1));
    const prevSameDaysEnd = new Date(prevMonthStart);
    prevSameDaysEnd.setUTCDate(prevMonthStart.getUTCDate() + billedDays - 1);
    const prevRes = await ctx.query<{ total: number }>(
      `SELECT COALESCE(SUM(cost_minor), 0)::bigint AS total
       FROM rollup_daily_workspace
       WHERE tenant_id = $1 AND usage_date BETWEEN $2 AND $3`,
      [
        ctx.tenantId,
        prevMonthStart.toISOString().slice(0, 10),
        prevSameDaysEnd.toISOString().slice(0, 10),
      ],
    );
    const previousMonthMinor = Number(prevRes.rows[0]?.total ?? 0);
    const monthOverMonthPct =
      previousMonthMinor > 0 ? ((billedMinor - previousMonthMinor) / previousMonthMinor) * 100 : null;

    // Week over week — trailing 7 vs prior 7, from history + current month.
    const lastTwoWeeks = await ctx.query<{ total: number; bucket: number }>(
      `SELECT
         SUM(CASE WHEN usage_date >= (CURRENT_DATE - INTERVAL '7 days') THEN cost_minor ELSE 0 END)::bigint AS bucket,
         SUM(CASE WHEN usage_date BETWEEN (CURRENT_DATE - INTERVAL '14 days') AND (CURRENT_DATE - INTERVAL '8 days') THEN cost_minor ELSE 0 END)::bigint AS total
       FROM rollup_daily_workspace
       WHERE tenant_id = $1
         AND usage_date BETWEEN (CURRENT_DATE - INTERVAL '14 days') AND CURRENT_DATE`,
      [ctx.tenantId],
    );
    const wowRow = lastTwoWeeks.rows[0]!;
    const last7 = Number(wowRow.bucket);
    const prior7 = Number(wowRow.total);
    const weekOverWeekPct = prior7 > 0 ? ((last7 - prior7) / prior7) * 100 : null;

    return {
      source: "real",
      workspace: FIXTURE.workspace,
      ingestedAt: (lastRun.finished_at ?? new Date()).toISOString(),
      currency,
      billedMinor,
      forecastMinor: billedMinor + forecastRemainingMinor,
      budgetMinor,
      unattributedMinor: Number(unattrRow.cost),
      unattributedPct,
      dailyMinor,
      billedDays,
      dbusTotal,
      costPerDbuMinor,
      previousMonthMinor,
      monthOverMonthPct,
      weekOverWeekPct,
    };
  });
}

function fixtureOverview(): OverviewData {
  return {
    source: "fixture",
    workspace: FIXTURE.workspace,
    ingestedAt: FIXTURE.ingestedAt,
    currency: "EUR",
    billedMinor: FIXTURE.billedMinor,
    forecastMinor: FIXTURE.forecastMinor,
    budgetMinor: FIXTURE.budgetMinor,
    unattributedMinor: FIXTURE.unattributedMinor,
    unattributedPct: FIXTURE.unattributedPct,
    dailyMinor: [...FIXTURE.dailyMinor],
    billedDays: FIXTURE.billedDays,
    dbusTotal: 0,
    costPerDbuMinor: null,
    previousMonthMinor: 0,
    monthOverMonthPct: null,
    weekOverWeekPct: null,
  };
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
}
