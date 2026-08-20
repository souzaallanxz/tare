import { withTenant } from "@tare/db";
import { listRecommendations, savingsSummary } from "@tare/db/repositories";
import { renderWeeklyReport, type WeeklyItem, type WeeklyReport } from "@tare/email";
import { getOverviewData } from "./overview-data";

const MAX_ITEMS = 3;

/**
 * Builds the weekly report for a tenant. Three items maximum — this is a
 * ranked list, not a digest. Confirmed savings from the previous week get
 * priority, then the loudest open change, then the budget projection.
 */
export async function buildWeeklyReport(tenantId: string, tenantName: string): Promise<WeeklyReport> {
  const overview = await getOverviewData(tenantId);
  const { recs, summary } = await withTenant(tenantId, async (ctx) => ({
    recs: await listRecommendations(ctx),
    summary: await savingsSummary(ctx),
  }));

  const items: WeeklyItem[] = [];

  const confirmed = recs.find((r) => r.state === "confirmed" && r.impactMinor);
  if (confirmed && confirmed.impactMinor) {
    items.push({
      headline: `${confirmed.entityName ?? "A workload"} fix is holding.`,
      detail: "Confirmed against the invoice",
      amountMinor: confirmed.impactMinor,
      basis: "billed",
      tone: "down",
    });
  }

  const change = recs.find((r) => r.rule === "cost_break" && r.state !== "not_observed");
  if (change && change.impactMinor && items.length < MAX_ITEMS) {
    items.push({
      headline: `${change.entityName ?? "A workload"} broke its baseline.`,
      detail: change.explanation.slice(0, 120),
      amountMinor: change.impactMinor,
      basis: change.impactBasis ?? "billed",
      tone: "up",
    });
  }

  const openFinding = recs.find(
    (r) => r.state === "open" && r.rule !== "cost_break" && r.rule !== "unattributed" && r.impactMinor,
  );
  if (openFinding && openFinding.impactMinor && items.length < MAX_ITEMS) {
    items.push({
      headline: `${openFinding.entityName ?? "A workload"} — ${humanRule(openFinding.rule)}.`,
      detail: openFinding.explanation.slice(0, 120),
      amountMinor: openFinding.impactMinor,
      basis: openFinding.impactBasis ?? "billed",
      tone: "up",
    });
  }

  if (items.length < MAX_ITEMS) {
    const pct = (overview.forecastMinor / overview.budgetMinor) * 100;
    items.push({
      headline: `You will reach ${pct.toFixed(1)}% of budget by month end.`,
      detail: "Estimated from the current run rate",
      amountMinor: overview.forecastMinor,
      basis: "estimated",
      tone: "neutral",
    });
  }

  return {
    tenantName,
    workspace: overview.workspace,
    weekLabel: weekLabel(new Date()),
    items,
    confirmedLifetimeMinor: summary.lifetimeMinor,
    currency: overview.currency,
    ingestedAt: overview.ingestedAt,
  };
}

export async function renderWeeklyReportFor(tenantId: string, tenantName: string): Promise<{ html: string; report: WeeklyReport }> {
  const report = await buildWeeklyReport(tenantId, tenantName);
  return { html: renderWeeklyReport(report), report };
}

function weekLabel(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}

function humanRule(id: string): string {
  switch (id) {
    case "jobs_on_all_purpose": return "jobs on all-purpose";
    case "no_autotermination":  return "no autotermination";
    case "idle_warehouse":      return "idle warehouse";
    case "instance_mismatch":   return "instance-type mismatch";
    default:                    return id;
  }
}
