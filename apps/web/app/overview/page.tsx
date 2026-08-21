import Link from "next/link";
import { redirect } from "next/navigation";
import { withTenant } from "@tare/db";
import { cloudInfraSummary, getConnection, listRecentAnomalies } from "@tare/db/repositories";
import { AnomalyList } from "../../components/anomaly-list";
import { AppShell } from "../../components/shell";
import { DailyChart } from "../../components/daily-chart";
import { Money } from "../../components/money";
import { PageHeader } from "../../components/page-header";
import { SpendBar } from "../../components/spend-bar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardBody, CardHeader, CardHint, CardTitle } from "../../components/ui/card";
import { Kpi, KpiGrid } from "../../components/ui/kpi";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
import { FIXTURE } from "../../lib/fixtures";
import { getOverviewData } from "../../lib/overview-data";
import { forecastReliability } from "../../lib/forecast-reliability";
import { getSkuBreakdown } from "../../lib/sku-breakdown";
import { requireSession } from "../../lib/session";

export default async function OverviewPage() {
  const session = await requireSession();

  // First-run: send a fresh tenant to Connection. Skip once any ingestion has
  // succeeded, so the CSV assessment path lands on Overview naturally.
  const { conn, hasRun } = await withTenant(session.activeTenant.id, async (ctx) => {
    const c = await getConnection(ctx);
    const r = await ctx.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM ingest_run WHERE tenant_id = $1 AND status = 'succeeded'`,
      [ctx.tenantId],
    );
    return { conn: c, hasRun: (r.rows[0]?.n ?? 0) > 0 };
  });
  if (!conn && !hasRun) redirect("/connect");

  const data = await getOverviewData(session.activeTenant.id);

  const { start: mStart, end: mEnd } = monthBoundsFromDaily(data.dailyMinor);
  const [anomalies, skus, infra] = await Promise.all([
    withTenant(session.activeTenant.id, (ctx) => listRecentAnomalies(ctx, { days: 30, limit: 8 })),
    getSkuBreakdown(session.activeTenant.id, mStart, mEnd),
    withTenant(session.activeTenant.id, (ctx) => cloudInfraSummary(ctx, mStart, mEnd)),
  ]);

  const totalMinor = data.billedMinor + infra.totalMinor;
  const totalBasis = infra.rows > 0 ? infra.basis : "estimated";
  const reliability = forecastReliability(data.dailyMinor.slice(0, data.billedDays));

  return (
    <AppShell active="overview" session={session}>
      <PageHeader
        title="Overview"
        description={
          data.source === "real"
            ? `Live · last ingested ${new Date(data.ingestedAt).toISOString().slice(0, 16).replace("T", " ")} UTC`
            : "Fixture data — connect a workspace to see real numbers"
        }
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/report">Preview this week&rsquo;s email</Link>
          </Button>
        }
      />

      {/* Money — spend and forecast */}
      <div className="mb-2 flex items-baseline gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[.14em] text-muted">Spend, month to date</h2>
      </div>
      <KpiGrid>
        <Kpi
          label="Databricks"
          value={<Money amount={data.billedMinor} basis="billed" currency={data.currency} />}
          hint={
            data.monthOverMonthPct !== null
              ? <DeltaBadge pct={data.monthOverMonthPct} label="vs prev month, same days" />
              : `${data.billedDays} day${data.billedDays === 1 ? "" : "s"}`
          }
        />
        <Kpi
          label="Cloud infrastructure"
          tone={infra.rows === 0 ? "estimated" : "default"}
          value={
            infra.rows > 0 ? (
              <Money amount={infra.totalMinor} basis={infra.basis} currency={infra.currency as "EUR" | "USD"} />
            ) : (
              "—"
            )
          }
          hint={
            infra.rows > 0
              ? `${infra.rows.toLocaleString("en-IE")} lines · Azure`
              : "Upload an Azure export in settings"
          }
        />
        <Kpi
          label="Total"
          tone={totalBasis === "estimated" ? "estimated" : "default"}
          value={<Money amount={totalMinor} basis={totalBasis} currency={data.currency} />}
          hint={infra.rows === 0 ? "Missing cloud infra keeps total estimated" : "Databricks + cloud"}
        />
        <Kpi
          tone="estimated"
          label="Forecast, month end"
          value={<Money amount={data.forecastMinor} basis="estimated" currency={data.currency} />}
          hint={
            <span className="flex flex-wrap items-center gap-2">
              <ReliabilityBadge level={reliability.level} />
              <span>{reliability.reasons.join(" · ")}</span>
            </span>
          }
        />
      </KpiGrid>

      {/* Signals — health of the numbers, not the numbers themselves */}
      <div className="mb-2 mt-6 flex items-baseline gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[.14em] text-muted">Signals</h2>
      </div>
      <KpiGrid cols={3}>
        <Kpi
          label="Spend with no owner"
          tone={data.unattributedPct >= 25 ? "overrun" : data.unattributedPct >= 10 ? "threshold" : "default"}
          value={`${data.unattributedPct.toFixed(1)}%`}
          hint={<Money amount={data.unattributedMinor} basis="billed" currency={data.currency} />}
        />
        <Kpi
          label="Week over week"
          tone={data.weekOverWeekPct === null ? "default" : data.weekOverWeekPct > 5 ? "overrun" : data.weekOverWeekPct < -5 ? "recovered" : "default"}
          value={data.weekOverWeekPct !== null ? formatSignedPct(data.weekOverWeekPct) : "—"}
          hint={data.weekOverWeekPct !== null ? "Last 7 vs prior 7 · billed only" : "Not enough history"}
        />
        <Kpi
          label="Data freshness"
          value={freshnessAge(data.ingestedAt)}
          hint={<FreshnessBadge ingestedAt={data.ingestedAt} />}
        />
      </KpiGrid>

      {/* Chart + top workloads left · budget + savings + consumption right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6 items-start mt-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily spend</CardTitle>
              <CardHint>Bars after the billed cut are forecast · green line is the 7-day mean</CardHint>
            </CardHeader>
            <CardBody>
              <DailyChart
                dailyMinor={data.dailyMinor}
                billedDays={data.billedDays}
                currency={data.currency}
                monthlyBudgetMinor={data.budgetMinor}
                cumulative
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top workloads</CardTitle>
              <Link href="/ledger" className="text-[13px] text-muted hover:text-ink">Open the ledger →</Link>
            </CardHeader>
            <Table>
              <THead>
                <TR>
                  <TH>Workload</TH>
                  <TH>Owner</TH>
                  <TH className="text-right">Month to date</TH>
                  <TH className="text-right">Projected</TH>
                </TR>
              </THead>
              <TBody>
                {FIXTURE.workloads.map((w) => (
                  <TR key={w.name}>
                    <TD>
                      <span className="font-medium">{w.name}</span>{" "}
                      <span className="ml-1.5 font-mono text-[11px] uppercase tracking-[.12em] text-muted">
                        {w.kind}
                      </span>
                    </TD>
                    <TD>{w.owner ?? <Badge variant="overrun">unassigned</Badge>}</TD>
                    <TD className="text-right">
                      <Money amount={w.mtdMinor} basis="billed" />
                    </TD>
                    <TD className="text-right">
                      <Money amount={w.projMinor} basis="estimated" />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Against budget</CardTitle>
              <CardHint>
                {`€${(data.budgetMinor / 100).toLocaleString("en-IE", { maximumFractionDigits: 0 })} monthly · ${((data.forecastMinor / data.budgetMinor) * 100).toFixed(1)}% projected`}
              </CardHint>
            </CardHeader>
            <CardBody>
              <SpendBar
                billedMinor={data.billedMinor}
                forecastMinor={data.forecastMinor}
                budgetMinor={data.budgetMinor}
                currency={data.currency}
              />
              <ConsumptionStats
                dbus={data.dbusTotal}
                costPerDbuMinor={data.costPerDbuMinor}
                currency={data.currency}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Confirmed savings</CardTitle>
              <CardHint>Lifetime</CardHint>
            </CardHeader>
            <CardBody>
              <div className="font-mono text-[30px] font-medium text-recovered">
                €{(FIXTURE.lifetimeConfirmedMinor / 100).toLocaleString("en-IE", { maximumFractionDigits: 0 })}
              </div>
              <p className="text-muted text-[13px] mt-2">
                Each amount verified against subsequent billing.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By SKU</CardTitle>
              <CardHint>Month to date</CardHint>
            </CardHeader>
            {skus.length === 0 ? (
              <CardBody className="text-muted">No usage in the current month.</CardBody>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>SKU</TH>
                    <TH className="text-right">Cost</TH>
                    <TH className="text-right">Share</TH>
                  </TR>
                </THead>
                <TBody>
                  {skus.slice(0, 6).map((r) => (
                    <TR key={r.sku}>
                      <TD className="font-mono text-[12px]">{r.sku}</TD>
                      <TD className="text-right">
                        <Money amount={r.costMinor} basis={r.basis} currency={data.currency} />
                      </TD>
                      <TD className="text-right font-mono tabular-nums">{r.pct.toFixed(1)}%</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent anomalies</CardTitle>
          <CardHint>Median + 3·MAD over 28 days · both directions</CardHint>
        </CardHeader>
        <AnomalyList rows={anomalies} />
      </Card>
    </AppShell>
  );
}

function ConsumptionStats({
  dbus,
  costPerDbuMinor,
  currency,
}: {
  dbus: number;
  costPerDbuMinor: number | null;
  currency: "EUR" | "USD";
}) {
  return (
    <div className="mt-5 pt-4 border-t border-rule grid grid-cols-2 gap-4 text-[13px]">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[.12em] text-muted">DBUs consumed</div>
        <div className="font-mono tabular-nums text-[16px] mt-1">
          {dbus.toLocaleString("en-IE", { maximumFractionDigits: 0 })}
        </div>
      </div>
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[.12em] text-muted">Blended rate / DBU</div>
        <div className="font-mono tabular-nums text-[16px] mt-1">
          {costPerDbuMinor !== null
            ? <Money amount={costPerDbuMinor} basis="billed" currency={currency} />
            : <span className="text-muted">—</span>}
        </div>
      </div>
    </div>
  );
}

function ReliabilityBadge({ level }: { level: "high" | "medium" | "low" }) {
  if (level === "high") return <Badge variant="recovered">reliability: high</Badge>;
  if (level === "medium") return <Badge variant="threshold">reliability: medium</Badge>;
  return <Badge variant="overrun">reliability: low</Badge>;
}

function DeltaBadge({ pct, label }: { pct: number; label: string }) {
  const variant = pct > 5 ? "overrun" : pct < -5 ? "recovered" : "muted";
  return (
    <Badge variant={variant}>
      {formatSignedPct(pct)} {label}
    </Badge>
  );
}

function formatSignedPct(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function freshnessAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return `${Math.floor(ms / 60_000)}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function FreshnessBadge({ ingestedAt }: { ingestedAt: string }) {
  const ageH = (Date.now() - new Date(ingestedAt).getTime()) / 3_600_000;
  const variant = ageH < 6 ? "recovered" : ageH < 24 ? "muted" : ageH < 48 ? "threshold" : "overrun";
  const label = ageH < 6 ? "current" : ageH < 24 ? "today" : ageH < 48 ? "stale" : "very stale";
  return <Badge variant={variant}>{label}</Badge>;
}

function monthBoundsFromDaily(daily: readonly number[]): { start: string; end: string } {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const days = daily.length;
  const end = new Date(monthStart);
  end.setUTCDate(monthStart.getUTCDate() + days - 1);
  return {
    start: monthStart.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}
