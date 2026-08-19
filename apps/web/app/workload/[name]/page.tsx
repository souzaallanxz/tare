import Link from "next/link";
import { AppShell } from "../../../components/shell";
import { DailyChart } from "../../../components/daily-chart";
import { Money } from "../../../components/money";
import { Pill } from "../../../components/pills";
import { FIXTURE } from "../../../lib/fixtures";

export default async function WorkloadPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const w = FIXTURE.workloads.find((x) => x.name === name) ?? FIXTURE.workloads[0]!;
  return (
    <AppShell active="ledger">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <p className="mut" style={{ fontSize: 13, margin: "0 0 6px" }}>
            <Link href="/ledger">Ledger</Link> / {w.kind}
          </p>
          <h1 className="display">{w.name}</h1>
          <p className="mut" style={{ margin: "6px 0 0" }}>
            {w.owner
              ? `Owner: ${w.owner} · resolved from ${w.src ?? "unknown"}`
              : "No owner resolved: no tag, no run_as, no creator."}
          </p>
        </div>
        <button className={w.owner ? "btn ghost s" : "btn s"}>
          {w.owner ? "Change owner" : "Assign an owner"}
        </button>
      </div>

      <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="kpi">
          <span className="label">Month to date</span>
          <div className="v"><Money amount={w.mtdMinor} basis="billed" /></div>
          <span className="n">{((w.mtdMinor / FIXTURE.billedMinor) * 100).toFixed(1)}% of workspace spend</span>
        </div>
        <div className="kpi">
          <span className="label">Projected, month end</span>
          <div className="v est"><Money amount={w.projMinor} basis="estimated" /></div>
          <span className="n">Same weekday, trailing four weeks</span>
        </div>
        <div className="kpi">
          <span className="label">Open findings</span>
          <div className="v">{w.findingId ? 1 : 0}</div>
          <span className="n">{w.findingId ? `${w.findingId} · see savings` : "Nothing detected this period"}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 24, alignItems: "start" }}>
        <div>
          <section className="panel">
            <header><span className="title">Daily cost</span><span className="label">31 days</span></header>
            <div className="pad"><DailyChart height={140} /></div>
          </section>
          <section className="panel">
            <header><span className="title">Recent runs</span><span className="label">Last five</span></header>
            <table>
              <thead>
                <tr>
                  <th>Run</th><th>Started</th><th>Duration</th><th>Status</th><th className="n">Cost</th>
                </tr>
              </thead>
              <tbody>
                {FIXTURE.runs.map((r) => (
                  <tr key={r.r}>
                    <td className="data">{r.r}</td>
                    <td className="data mut">{r.s}</td>
                    <td className="data">{r.t}</td>
                    <td>
                      {r.st === "Succeeded"
                        ? <span className="mut" style={{ fontSize: 13 }}>Succeeded</span>
                        : <Pill variant="thr">{r.st}</Pill>}
                    </td>
                    <td className="n"><Money amount={r.cMinor} basis="billed" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
        <div>
          <section className="panel">
            <header><span className="title">Configuration</span><span className="label">Snapshot, 23 Aug</span></header>
            <div style={{ display: "grid", gridTemplateColumns: "186px 1fr" }}>
              {([
                ["Compute", "Jobs compute"],
                ["Node type", "Standard_D8ads_v5"],
                ["Workers", "2 → 8, autoscale"],
                ["Autotermination", "10 min"],
                ["Runtime", "15.4 LTS"],
                ["Tags", "team=platform, env=prod"],
              ] as const).map(([k, v], i, a) => {
                const border = i === a.length - 1 ? undefined : "1px solid var(--color-rule)";
                return (
                  <div key={k} style={{ display: "contents" }}>
                    <div className="label" style={{ padding: "10px 16px", paddingTop: 13, borderBottom: border }}>{k}</div>
                    <div className="data" style={{ padding: "10px 16px", borderBottom: border }}>{v}</div>
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
