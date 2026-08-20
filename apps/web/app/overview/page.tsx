import Link from "next/link";
import { redirect } from "next/navigation";
import { withTenant } from "@tare/db";
import { getConnection, listRecentAnomalies } from "@tare/db/repositories";
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

  const [data, anomalies] = await Promise.all([
    getOverviewData(session.activeTenant.id),
    withTenant(session.activeTenant.id, (ctx) => listRecentAnomalies(ctx, { days: 30, limit: 8 })),
  ]);
  const pctOfBudget = ((data.forecastMinor / data.budgetMinor) * 100).toFixed(1);

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

      <KpiGrid>
        <Kpi
          label="Spend with no owner"
          value={`${data.unattributedPct.toFixed(1)}%`}
          hint={<Money amount={data.unattributedMinor} basis="billed" currency={data.currency} />}
        />
        <Kpi
          label="Spend to date"
          value={<Money amount={data.billedMinor} basis="billed" currency={data.currency} />}
          hint={`${data.billedDays} day${data.billedDays === 1 ? "" : "s"} · rate card set in settings`}
        />
        <Kpi
          tone="estimated"
          label="Forecast, month end"
          value={<Money amount={data.forecastMinor} basis="estimated" currency={data.currency} />}
          hint="Same weekday, trailing four weeks"
        />
        <Kpi
          label="Budget"
          value={`€${(data.budgetMinor / 100).toLocaleString("en-IE", { maximumFractionDigits: 0 })}`}
          hint={<Badge variant="threshold">{pctOfBudget}% projected</Badge>}
        />
      </KpiGrid>

      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6 items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily spend</CardTitle>
              <CardHint>Bars after the billed cut are forecast</CardHint>
            </CardHeader>
            <CardBody>
              <DailyChart dailyMinor={data.dailyMinor} billedDays={data.billedDays} currency={data.currency} />
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
            </CardHeader>
            <CardBody>
              <SpendBar
                billedMinor={data.billedMinor}
                forecastMinor={data.forecastMinor}
                budgetMinor={data.budgetMinor}
                currency={data.currency}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Confirmed savings</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="font-mono text-[30px] font-medium text-recovered">
                €{(FIXTURE.lifetimeConfirmedMinor / 100).toLocaleString("en-IE", { maximumFractionDigits: 0 })}
              </div>
              <p className="text-muted text-[13px] mt-2">
                Over twelve months, each amount verified against subsequent billing.
              </p>
            </CardBody>
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
