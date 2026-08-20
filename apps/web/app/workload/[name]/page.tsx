import Link from "next/link";
import { notFound } from "next/navigation";
import { withTenant } from "@tare/db";
import { listOwners } from "@tare/db/repositories";
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
import { getWorkloadByExternalId } from "../../../lib/workload-data";
import { AssignOwnerButton } from "./assign-owner";
import type { RecommendationState } from "@tare/core";

export default async function WorkloadPage({ params }: { params: Promise<{ name: string }> }) {
  const session = await requireSession();
  const { name } = await params;
  const externalId = decodeURIComponent(name);
  const [data, owners] = await Promise.all([
    getWorkloadByExternalId(session.activeTenant.id, externalId),
    withTenant(session.activeTenant.id, (ctx) => listOwners(ctx)),
  ]);
  if (!data) notFound();

  const { entity, config, daily, totalMinor, currency, findings, workspaceTotalMinor } = data;
  const share = workspaceTotalMinor > 0 ? (totalMinor / workspaceTotalMinor) * 100 : 0;

  const days = 30;
  const today = new Date();
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - (days - 1 - i));
    const iso = d.toISOString().slice(0, 10);
    return daily.find((x) => x.date === iso)?.costMinor ?? 0;
  });
  const billedCut = buckets.length;

  const openFindings = findings.filter(
    (f) => f.state !== "confirmed" && f.state !== "not_observed",
  );

  return (
    <AppShell active="ledger" session={session}>
      <PageHeader
        eyebrow={<><Link href="/ledger" className="hover:underline">Ledger</Link> / {entity.kind}</>}
        title={entity.name}
        description={
          entity.ownerName
            ? `Owner: ${entity.ownerName}${entity.ownerSource ? ` · resolved from ${entity.ownerSource}` : ""}`
            : "No owner resolved: no tag, no run_as, no creator."
        }
        actions={
          <AssignOwnerButton
            entityId={entity.id}
            owners={owners.map((o) => ({ id: o.id, name: o.name, kind: o.kind }))}
            currentOwnerName={entity.ownerName}
            currentSource={entity.ownerSource}
          />
        }
      />

      <KpiGrid cols={3}>
        <Kpi
          label="Last 30 days"
          value={<Money amount={totalMinor} basis="billed" currency={currency} />}
          hint={`${share.toFixed(1)}% of workspace spend`}
        />
        <Kpi
          label="First seen"
          value={<span className="text-[20px]">{entity.firstSeen}</span>}
          hint={`last ${entity.lastSeen}`}
        />
        <Kpi
          label="Open findings"
          value={String(openFindings.length)}
          hint={`${findings.length - openFindings.length} closed`}
        />
      </KpiGrid>

      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6 items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily cost</CardTitle>
              <CardHint>30 days</CardHint>
            </CardHeader>
            <CardBody>
              <DailyChart
                dailyMinor={buckets}
                billedDays={billedCut}
                height={140}
                currency={currency}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Findings</CardTitle>
              <CardHint>{findings.length} total</CardHint>
            </CardHeader>
            {findings.length === 0 ? (
              <CardBody className="text-muted">
                No rules matched this workload in the current window. Six rules ran at the last ingestion.
              </CardBody>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Rule</TH>
                    <TH>State</TH>
                    <TH className="text-right">Impact</TH>
                    <TH>Basis</TH>
                    <TH>Opened</TH>
                  </TR>
                </THead>
                <TBody>
                  {findings.map((f) => (
                    <TR key={f.id}>
                      <TD>{humanRule(f.rule)}</TD>
                      <TD><StatePill state={f.state as RecommendationState} /></TD>
                      <TD className="text-right">
                        <Money
                          amount={f.impactMinor}
                          basis={f.impactBasis ?? "billed"}
                          currency={f.currency as "EUR" | "USD"}
                        />
                      </TD>
                      <TD>{f.impactBasis ? <BasisPill basis={f.impactBasis} /> : "—"}</TD>
                      <TD className="font-mono text-muted">{f.openedAt.slice(0, 10)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardHint>{config ? `snapshot ${config.observedOn}` : "no snapshot"}</CardHint>
            </CardHeader>
            {config ? (
              <Kv rows={[
                ["Node type", config.nodeType ?? "—"],
                ["Workers", config.minWorkers != null || config.maxWorkers != null
                  ? `${config.minWorkers ?? "—"} → ${config.maxWorkers ?? "—"}`
                  : "—"],
                ["Autotermination", config.autoterminationMinutes != null
                  ? `${config.autoterminationMinutes} min`
                  : "none"],
                ["Runtime", config.runtimeVersion ?? "—"],
                ["Tags", Object.keys(config.tags).length
                  ? Object.entries(config.tags).map(([k, v]) => `${k}=${v}`).join(", ")
                  : "—"],
              ]} />
            ) : (
              <CardBody className="text-muted">
                No config observed yet. Cluster snapshots land during ingestion; jobs have no equivalent.
              </CardBody>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Identity</CardTitle>
            </CardHeader>
            <Kv rows={[
              ["Kind", entity.kind],
              ["External id", entity.externalId],
              ["Owner", entity.ownerName ?? "unattributed"],
              ["Source", entity.ownerSource ?? "—"],
            ]}
            highlightUnattributed={!entity.ownerName} />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Kv({
  rows,
  highlightUnattributed,
}: {
  rows: readonly [string, string][];
  highlightUnattributed?: boolean;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr]">
      {rows.map(([k, v], i, a) => {
        const border = i === a.length - 1 ? "" : "border-b border-rule";
        const emphUnattr = highlightUnattributed && k === "Owner" && v === "unattributed";
        return (
          <div key={k} className="contents">
            <div className={`px-4 py-2.5 pt-3 font-mono text-[11px] uppercase tracking-[.12em] text-muted ${border}`}>
              {k}
            </div>
            <div className={`px-4 py-2.5 font-mono text-[13px] tabular-nums ${border}`}>
              {emphUnattr ? <Badge variant="overrun">unattributed</Badge> : v}
            </div>
          </div>
        );
      })}
    </div>
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
    default:                    return id;
  }
}
