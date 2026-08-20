import { AppShell } from "../../components/shell";
import { Money } from "../../components/money";
import { FIXTURE } from "../../lib/fixtures";
import { requireSession } from "../../lib/session";

export default async function OwnersPage() {
  const session = await requireSession();
  return (
    <AppShell active="owners" session={session}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 className="display">Owners</h1>
          <p className="mut" style={{ margin: "6px 0 0" }}>
            Attribution resolves in priority order. Whatever no rule matches stays on screen.
          </p>
        </div>
        <button className="btn s">Add a rule</button>
      </div>

      <section className="panel" style={{ borderLeft: "2px solid var(--color-overrun)" }}>
        <div className="pad" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div>
            <span className="label">Unattributed spend</span>
            <div style={{ fontSize: 26, fontFamily: "var(--font-mono)", fontWeight: 500, marginTop: 6 }}>
              {FIXTURE.unattributedPct.toFixed(1)}% ·{" "}
              <Money amount={FIXTURE.unattributedMinor} basis="billed" />
            </div>
            <p className="mut" style={{ fontSize: 13, margin: "8px 0 0", maxWidth: "62ch" }}>
              Two entities account for most of it: the ad-hoc-sql warehouse and the shared-interactive cluster.
              Neither carries a team tag, and neither has a creator still at the company.
            </p>
          </div>
          <button className="btn">Assign the two largest</button>
        </div>
      </section>

      <section className="panel">
        <header><span className="title">Spend by owner</span><span className="label">Month to date</span></header>
        <table>
          <thead>
            <tr>
              <th>Owner</th><th>Resolved from</th>
              <th className="n">Entities</th><th className="n">Spend</th><th className="n">Share</th>
            </tr>
          </thead>
          <tbody>
            {FIXTURE.owners.map((o) => (
              <tr key={o.name}>
                <td>
                  <span style={{ fontWeight: 500, color: o.name === "Unattributed" ? "var(--color-overrun)" : undefined }}>
                    {o.name}
                  </span>
                </td>
                <td className="mut" style={{ fontSize: 13 }}>{o.src}</td>
                <td className="n data">{o.ents}</td>
                <td className="n"><Money amount={o.spendMinor} basis="billed" /></td>
                <td className="n data">{o.pct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <header><span className="title">Attribution rules</span><span className="label">First match wins</span></header>
        <table>
          <thead>
            <tr>
              <th>Priority</th><th>Matcher</th><th>Owner</th><th className="n">Entities matched</th>
            </tr>
          </thead>
          <tbody>
            {FIXTURE.attributionRules.map((r) => (
              <tr key={r.priority}>
                <td className="data mut">{r.priority}</td>
                <td className="data">{r.matcher}</td>
                <td>{r.owner}</td>
                <td className="n data">{r.hits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
