import { AppShell } from "../../components/shell";
import { Money } from "../../components/money";
import { BasisPill, StatePill } from "../../components/pills";
import { FIXTURE } from "../../lib/fixtures";
import { requireSession } from "../../lib/session";
import type { RecommendationState } from "@tare/core";

const SEQUENCE: RecommendationState[] = ["open", "accepted", "applied", "verifying", "confirmed"];

function Chain({ state }: { state: RecommendationState }) {
  if (state === "not_observed") {
    const done = ["open", "accepted", "applied", "verifying"];
    return (
      <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
        {done.map((s) => (
          <span key={s} style={{ color: "var(--color-ink)" }}>{s}</span>
        ))}
        <span style={{ color: "var(--color-overrun)", borderBottom: "1px solid currentColor" }}>not observed</span>
      </span>
    );
  }
  const i = SEQUENCE.indexOf(state);
  return (
    <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
      {SEQUENCE.map((s, j) => (
        <span
          key={s}
          style={{
            color: j <= i ? "var(--color-ink)" : "var(--color-muted)",
            borderBottom: j === i ? "1px solid currentColor" : undefined,
          }}
        >
          {s}
        </span>
      ))}
    </span>
  );
}

export default async function SavingsPage() {
  const session = await requireSession();
  return (
    <AppShell active="savings" session={session}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 className="display">Savings</h1>
          <p className="mut" style={{ margin: "6px 0 0" }}>
            A recommendation is a suggestion. A saving is a fact with a date.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="sel">State: all ⌄</button>
          <button className="sel">Rule: all ⌄</button>
        </div>
      </div>

      <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="kpi">
          <span className="label">Confirmed, twelve months</span>
          <div className="v rec">
            €{(FIXTURE.lifetimeConfirmedMinor / 100).toLocaleString("en-IE", { maximumFractionDigits: 0 })}
          </div>
          <span className="n">Verified against subsequent billing</span>
        </div>
        <div className="kpi">
          <span className="label">In verification</span>
          <div className="v est"><Money amount={610_00} basis="estimated" /></div>
          <span className="n">One recommendation, day 5 of 28</span>
        </div>
        <div className="kpi">
          <span className="label">Not observed</span>
          <div className="v ovr">1</div>
          <span className="n">Applied, but no measurable fall</span>
        </div>
      </div>

      {FIXTURE.recommendations.map((r) => {
        const heading = r.state === "confirmed" ? "Confirmed" : r.kind === "change" ? "Change" : "Impact";
        const tone: "up" | "down" | "neutral" =
          r.state === "confirmed" ? "down" : r.kind === "change" ? "up" : "neutral";
        return (
          <section key={r.id} className="panel">
            <header>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span className="data mut">{r.id}</span>
                <span className="title">{r.rule}</span>
                <span className="label">{r.entity}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <StatePill state={r.state} />
                <BasisPill basis={r.basis} />
              </div>
            </header>
            <div className="pad">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 26, flexWrap: "wrap" }}>
                <p className="mut" style={{ maxWidth: "66ch", margin: 0 }}>{r.why}</p>
                <div style={{ textAlign: "right" }}>
                  <div className="label">{heading}</div>
                  <div style={{ fontSize: 22, marginTop: 4 }}>
                    <Money amount={r.impactMinor} basis={r.basis} tone={tone} />
                  </div>
                  {r.impactMinor !== null && (
                    <div className="mut" style={{ fontSize: 12, marginTop: 2 }}>per month</div>
                  )}
                </div>
              </div>
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop: "1px solid var(--color-rule)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "var(--color-muted)",
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <Chain state={r.state} />
                <span className="mut" style={{ marginLeft: "auto", textTransform: "none", letterSpacing: 0 }}>
                  {r.when}
                </span>
              </div>
            </div>
          </section>
        );
      })}
    </AppShell>
  );
}
