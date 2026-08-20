import Link from "next/link";
import { Lockup } from "../components/logo";
import { Money } from "../components/money";
import { SpendBar } from "../components/spend-bar";
import { FIXTURE } from "../lib/fixtures";

export default function MarketingPage() {
  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 28px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 0",
          borderBottom: "1px solid var(--color-rule)",
        }}
      >
        <Link href="/"><Lockup /></Link>
        <div style={{ display: "flex", gap: 24, alignItems: "center", fontSize: 14 }}>
          <Link href="/security" className="mut">Security</Link>
          <Link href="/sample" className="mut">Sample report</Link>
          <Link className="btn s" href="/login">Log in</Link>
        </div>
      </div>

      <section
        style={{
          padding: "80px 0 60px",
          display: "grid",
          gridTemplateColumns: "1.02fr .98fr",
          gap: 60,
          alignItems: "start",
        }}
      >
        <div>
          <h1 style={{ fontSize: 46, fontWeight: 500, letterSpacing: "-.03em", lineHeight: 1.06, margin: "0 0 20px" }}>
            Your Databricks bill, explained line by line.
          </h1>
          <p style={{ fontSize: 17, color: "var(--color-muted)", maxWidth: "45ch", margin: "0 0 26px" }}>
            Every euro tied to a team, a job and a decision. Estimates marked as estimates. Savings verified
            against the next invoice before anyone counts them.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="btn" href="/sample">Read a sample report</Link>
            <Link className="btn ghost" href="/overview">Walk through the product</Link>
          </div>
        </div>

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-rule)", padding: 22 }}>
          <div className="label" style={{ marginBottom: 14 }}>
            Workspace · {FIXTURE.workspace} · {FIXTURE.period}
          </div>
          <SpendBar
            billedMinor={FIXTURE.billedMinor}
            forecastMinor={FIXTURE.forecastMinor}
            budgetMinor={FIXTURE.budgetMinor}
          />
          <Row label="Billed to date">
            <Money amount={FIXTURE.billedMinor} basis="billed" />
          </Row>
          <Row label="Forecast, month end">
            <Money amount={FIXTURE.forecastMinor} basis="estimated" />
          </Row>
          <Row label="Spend with no owner">
            <span className="data">{FIXTURE.unattributedPct.toFixed(1)}%</span>
          </Row>
        </div>
      </section>

      <footer
        style={{
          padding: "38px 0 60px",
          borderTop: "1px solid var(--color-rule)",
          color: "var(--color-muted)",
          fontSize: 13,
        }}
      >
        Phase 0 skeleton · every figure on this page is fixture data.
      </footer>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "10px 0",
        borderTop: "1px solid var(--color-rule)",
      }}
    >
      <span>{label}</span>
      {children}
    </div>
  );
}
