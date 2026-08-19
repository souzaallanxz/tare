import Link from "next/link";
import { AppShell } from "../../components/shell";
import { DailyChart } from "../../components/daily-chart";
import { Money } from "../../components/money";
import { Pill } from "../../components/pills";
import { SpendBar } from "../../components/spend-bar";
import { FIXTURE } from "../../lib/fixtures";

export default function OverviewPage() {
  const pctOfBudget = ((FIXTURE.forecastMinor / FIXTURE.budgetMinor) * 100).toFixed(1);
  return (
    <AppShell active="overview">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 className="display">Overview</h1>
          <p className="mut" style={{ margin: "6px 0 0" }}>{FIXTURE.period} · billed through Sunday the 23rd</p>
        </div>
        <Link className="btn ghost s" href="/report">Preview this week&rsquo;s email</Link>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span className="label">Spend with no owner</span>
          <div className="v">{FIXTURE.unattributedPct.toFixed(1)}%</div>
          <span className="n">
            <Money amount={FIXTURE.unattributedMinor} basis="billed" /> across 14 entities
          </span>
        </div>
        <div className="kpi">
          <span className="label">Billed to date</span>
          <div className="v"><Money amount={FIXTURE.billedMinor} basis="billed" /></div>
          <span className="n">23 days, priced at list — no rate card yet</span>
        </div>
        <div className="kpi">
          <span className="label">Forecast, month end</span>
          <div className="v est"><Money amount={FIXTURE.forecastMinor} basis="estimated" /></div>
          <span className="n">Same weekday, trailing four weeks</span>
        </div>
        <div className="kpi">
          <span className="label">Budget</span>
          <div className="v">€{(FIXTURE.budgetMinor / 100).toLocaleString("en-IE", { maximumFractionDigits: 0 })}</div>
          <span className="n"><Pill variant="thr">{pctOfBudget}% projected</Pill></span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 24, alignItems: "start" }}>
        <div>
          <section className="panel">
            <header>
              <span className="title">Daily spend</span>
              <span className="label">Bars after the 23rd are forecast</span>
            </header>
            <div className="pad"><DailyChart /></div>
          </section>

          <section className="panel">
            <header>
              <span className="title">Top workloads</span>
              <Link className="mut" style={{ fontSize: 13 }} href="/ledger">Open the ledger →</Link>
            </header>
            <table>
              <thead>
                <tr>
                  <th>Workload</th><th>Owner</th><th className="n">Month to date</th><th className="n">Projected</th>
                </tr>
              </thead>
              <tbody>
                {FIXTURE.workloads.map((w) => (
                  <tr key={w.name}>
                    <td>
                      <span style={{ fontWeight: 500 }}>{w.name}</span>{" "}
                      <span className="label" style={{ marginLeft: 6 }}>{w.kind}</span>
                    </td>
                    <td>{w.owner ?? <Pill variant="ovr">unassigned</Pill>}</td>
                    <td className="n"><Money amount={w.mtdMinor} basis="billed" /></td>
                    <td className="n"><Money amount={w.projMinor} basis="estimated" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <div>
          <section className="panel">
            <header><span className="title">Against budget</span></header>
            <div className="pad">
              <SpendBar
                billedMinor={FIXTURE.billedMinor}
                forecastMinor={FIXTURE.forecastMinor}
                budgetMinor={FIXTURE.budgetMinor}
              />
            </div>
          </section>

          <section className="panel">
            <header><span className="title">Confirmed savings</span></header>
            <div className="pad">
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 30, color: "var(--color-recovered)", fontWeight: 500 }}>
                €{(FIXTURE.lifetimeConfirmedMinor / 100).toLocaleString("en-IE", { maximumFractionDigits: 0 })}
              </div>
              <p className="mut" style={{ fontSize: 13, margin: "8px 0 0" }}>
                Over twelve months, each amount verified against subsequent billing. One recommendation in the
                same period produced no measurable fall and is recorded as not observed.
              </p>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
