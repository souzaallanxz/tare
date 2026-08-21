import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/shell";
import { DailyChart } from "../../../components/daily-chart";
import { Money } from "../../../components/money";
import { PageHeader } from "../../../components/page-header";
import { BasisPill, StatePill } from "../../../components/pills";
import { Badge } from "../../../components/ui/badge";
import { Card, CardBody, CardHeader, CardHint, CardTitle } from "../../../components/ui/card";
import { Kpi, KpiGrid } from "../../../components/ui/kpi";
import { Table, TBody, TD, TH, THead, TR } from "../../../components/ui/table";
import { requireSession } from "../../../lib/session";
import { getOwnerDetail } from "../../../lib/owner-detail";
import type { RecommendationState } from "@tare/core";

export default async function OwnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const data = await getOwnerDetail(session.activeTenant.id, id);
  if (!data) notFound();

  const days = 60;
  const today = new Date();
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - (days - 1 - i));
    const iso = d.toISOString().slice(0, 10);
    return data.daily.find((x) => x.date === iso)?.costMinor ?? 0;
  });

  const openCount = data.findings.filter(
    (f) => f.state !== "confirmed" && f.state !== "not_observed",
  ).length;

  return (
    <AppShell active="owners" session={session}>
      <PageHeader
        eyebrow={<Link href="/owners" className="hover:underline">Owners</Link>}
        title={data.name}
        description={
          data.ownerId === null
            ? "Entities the attribution engine could not resolve to any owner."
            : `Every entity attributed to ${data.name}.`
        }
        actions={
          data.ownerId === null ? <Badge variant="overrun">unattributed</Badge> : null
        }
      />

      <KpiGrid cols={3}>
        <Kpi
          label="Last 60 days"
          value={<Money amount={data.totalMinor} basis="billed" currency={data.currency} />}
        />
        <Kpi label="Entities" value={String(data.entities.length)} />
        <Kpi
          label="Open findings"
          value={String(openCount)}
          hint={`${data.findings.length - openCount} closed`}
        />
      </KpiGrid>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Daily cost</CardTitle>
          <CardHint>60 days</CardHint>
        </CardHeader>
        <CardBody>
          <DailyChart dailyMinor={buckets} billedDays={buckets.length} currency={data.currency} />
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Entities</CardTitle>
          <CardHint>By spend, last 60 days</CardHint>
        </CardHeader>
        {data.entities.length === 0 ? (
          <CardBody className="text-muted">No entities.</CardBody>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Kind</TH>
                <TH className="text-right">Cost</TH>
                <TH>Basis</TH>
              </TR>
            </THead>
            <TBody>
              {data.entities.map((e) => (
                <TR key={e.id}>
                  <TD>
                    <Link
                      href={`/workload/${encodeURIComponent(e.name)}` as never}
                      className="font-medium hover:underline"
                    >
                      {e.name}
                    </Link>
                  </TD>
                  <TD className="text-muted text-[13px]">{e.kind}</TD>
                  <TD className="text-right">
                    <Money amount={e.costMinor} basis={e.basis} currency={data.currency} />
                  </TD>
                  <TD><BasisPill basis={e.basis} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Findings</CardTitle>
          <CardHint>Top 20 by impact</CardHint>
        </CardHeader>
        {data.findings.length === 0 ? (
          <CardBody className="text-muted">Nothing detected on this owner.</CardBody>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Rule</TH>
                <TH>Entity</TH>
                <TH>State</TH>
                <TH className="text-right">Impact</TH>
                <TH>Basis</TH>
              </TR>
            </THead>
            <TBody>
              {data.findings.map((f) => (
                <TR key={f.id}>
                  <TD>{humanRule(f.rule)}</TD>
                  <TD>{f.entityName ?? "workspace"}</TD>
                  <TD><StatePill state={f.state as RecommendationState} /></TD>
                  <TD className="text-right">
                    <Money
                      amount={f.impactMinor}
                      basis={f.impactBasis ?? "billed"}
                      currency={data.currency}
                    />
                  </TD>
                  <TD>{f.impactBasis ? <BasisPill basis={f.impactBasis} /> : "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </AppShell>
  );
}

function humanRule(id: string): string {
  switch (id) {
    case "jobs_on_all_purpose": return "Jobs on all-purpose compute";
    case "no_autotermination":  return "No or long autotermination";
    case "idle_warehouse":      return "Idle SQL warehouse";
    case "instance_mismatch":   return "Instance-type mismatch";
    case "cost_break":          return "Cost break";
    case "unattributed":        return "Unattributed spend";
    case "right_sizing":        return "Autoscale cap set too high";
    case "dbr_upgrade":         return "Runtime version needs upgrading";
    case "spot_candidate":      return "Job could run on spot instances";
    default:                    return id;
  }
}
