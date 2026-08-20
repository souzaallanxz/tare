import Link from "next/link";
import { notFound } from "next/navigation";
import { withTenant } from "@tare/db";
import { listOwners } from "@tare/db/repositories";
import { AppShell } from "../../../components/shell";
import { DailyChart } from "../../../components/daily-chart";
import { Money } from "../../../components/money";
import { BasisPill, Pill, StatePill } from "../../../components/pills";
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

  // Fill sparse daily series to a contiguous window for the chart.
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <p className="mut" style={{ fontSize: 13, margin: "0 0 6px" }}>
            <Link href="/ledger">Ledger</Link> / {entity.kind}
          </p>
          <h1 className="display">{entity.name}</h1>
          <p className="mut" style={{ margin: "6px 0 0" }}>
            {entity.ownerName
              ? `Owner: ${entity.ownerName}${entity.ownerSource ? ` · resolved from ${entity.ownerSource}` : ""}`
              : "No owner resolved: no tag, no run_as, no creator."}
          </p>
        </div>
        <AssignOwnerButton
          entityId={entity.id}
          owners={owners.map((o) => ({ id: o.id, name: o.name, kind: o.kind }))}
          currentOwnerName={entity.ownerName}
          currentSource={entity.ownerSource}
        />
      </div>

      <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="kpi">
          <span className="label">Last 30 days</span>
          <div className="v">
            <Money amount={totalMinor} basis="billed" currency={currency} />
          </div>
          <span className="n">{share.toFixed(1)}% of workspace spend</span>
        </div>
        <div className="kpi">
          <span className="label">First seen</span>
          <div className="v" style={{ fontSize: 20 }}>{entity.firstSeen}</div>
          <span className="n">last {entity.lastSeen}</span>
        </div>
        <div className="kpi">
          <span className="label">Open findings</span>
          <div className="v">{openFindings.length}</div>
          <span className="n">{findings.length - openFindings.length} closed</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 24, alignItems: "start" }}>
        <div>
          <section className="panel">
            <header><span className="title">Daily cost</span><span className="label">30 days</span></header>
            <div className="pad">
              <DailyChart dailyMinor={buckets} billedDays={billedCut} height={140} />
            </div>
          </section>

          <section className="panel">
            <header>
              <span className="title">Findings</span>
              <span className="label">{findings.length} total</span>
            </header>
            {findings.length === 0 ? (
              <div className="pad mut">
                No rules matched this workload in the current window. Six rules ran at the last ingestion.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Rule</th><th>State</th>
                    <th className="n">Impact</th><th>Basis</th>
                    <th>Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {findings.map((f) => (
                    <tr key={f.id}>
                      <td>{humanRule(f.rule)}</td>
                      <td><StatePill state={f.state as RecommendationState} /></td>
                      <td className="n">
                        <Money
                          amount={f.impactMinor}
                          basis={f.impactBasis ?? "billed"}
                          currency={f.currency as "EUR" | "USD"}
                        />
                      </td>
                      <td>{f.impactBasis ? <BasisPill basis={f.impactBasis} /> : "—"}</td>
                      <td className="data mut">{f.openedAt.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <div>
          <section className="panel">
            <header>
              <span className="title">Configuration</span>
              <span className="label">{config ? `snapshot ${config.observedOn}` : "no snapshot"}</span>
            </header>
            {config ? (
              <div style={{ display: "grid", gridTemplateColumns: "160px 1fr" }}>
                {(
                  [
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
                  ] as const
                ).map(([k, v], i, a) => {
                  const border = i === a.length - 1 ? undefined : "1px solid var(--color-rule)";
                  return (
                    <div key={k} style={{ display: "contents" }}>
                      <div className="label" style={{ padding: "10px 16px", paddingTop: 13, borderBottom: border }}>{k}</div>
                      <div className="data" style={{ padding: "10px 16px", borderBottom: border }}>{v}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="pad mut">
                No config observed yet. Cluster snapshots land during ingestion; jobs have no equivalent.
              </div>
            )}
          </section>

          <section className="panel">
            <header><span className="title">Identity</span></header>
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr" }}>
              {([
                ["Kind", entity.kind],
                ["External id", entity.externalId],
                ["Owner", entity.ownerName ?? "unattributed"],
                ["Source", entity.ownerSource ?? "—"],
              ] as const).map(([k, v], i, a) => {
                const border = i === a.length - 1 ? undefined : "1px solid var(--color-rule)";
                return (
                  <div key={k} style={{ display: "contents" }}>
                    <div className="label" style={{ padding: "10px 16px", paddingTop: 13, borderBottom: border }}>{k}</div>
                    <div className="data" style={{ padding: "10px 16px", borderBottom: border }}>
                      {k === "Owner" && !entity.ownerName ? (
                        <Pill variant="ovr">unattributed</Pill>
                      ) : v}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
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
    default:                    return id;
  }
}
