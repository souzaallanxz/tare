import Link from "next/link";
import { Lockup } from "../components/logo";
import { Money } from "../components/money";
import { Pill } from "../components/pills";
import { SpendBar } from "../components/spend-bar";
import { FIXTURE } from "../lib/fixtures";

const GRANTS = `GRANT USE CATALOG ON CATALOG system          TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.billing   TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.compute   TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.lakeflow  TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.query     TO \`tare-service-principal\`;`;

const REVOKE = `REVOKE USE CATALOG ON CATALOG system FROM \`tare-service-principal\`;`;

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
          <a href="#security" className="mut">Security</a>
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

      <section id="security" style={{ padding: "60px 0", borderTop: "1px solid var(--color-rule)", scrollMarginTop: 24 }}>
        <p className="label">Security and access</p>
        <h2 style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-.022em", margin: "8px 0 14px" }}>
          What Tare is allowed to read.
        </h2>
        <p className="mut" style={{ fontSize: 16, maxWidth: "62ch", margin: "0 0 26px" }}>
          Read-only, aggregates only, scoped to the <span className="data">system</span> catalog. Never your tables,
          your query text, or your results. Revoked in one statement.
        </p>

        <SubHead>The exact grants</SubHead>
        <pre style={codeBlock}>{GRANTS}</pre>

        <SubHead>Residency</SubHead>
        <Kv rows={[
          ["Application",  "Vercel · EU (Frankfurt)"],
          ["Database",     "Neon · EU (Frankfurt)"],
          ["Object storage", "EU only"],
          ["Auth tokens",  "Never persisted (in-memory)"],
          ["Backups",      "Neon PITR, EU region"],
        ]} />

        <SubHead>Certifications</SubHead>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Pill variant="ovr">no SOC 2 yet</Pill>
          <span className="mut" style={{ fontSize: 14 }}>DPA available before signature</span>
        </div>
        <p className="mut" style={{ fontSize: 14, marginTop: 14, maxWidth: "70ch" }}>
          If your security review requires a current SOC 2 report, this is not yet the right year to buy.
          Everything else — EU residency, read-only aggregates, revocable access, published grant list —
          holds today.
        </p>

        <SubHead>Ending access</SubHead>
        <p className="mut" style={{ maxWidth: "70ch", margin: "0 0 14px" }}>
          One statement in your workspace ends all access immediately. Tare keeps aggregates already ingested
          until you delete the tenant.
        </p>
        <pre style={codeBlock}>{REVOKE}</pre>
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

function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 17, fontWeight: 500, margin: "26px 0 10px" }}>{children}</h3>
  );
}

function Kv({ rows }: { rows: readonly [string, string][] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr" }}>
      {rows.map(([k, v], i) => {
        const border = i === rows.length - 1 ? undefined : "1px solid var(--color-rule)";
        return (
          <div key={k} style={{ display: "contents" }}>
            <div className="label" style={{ padding: "10px 0", paddingTop: 13, borderBottom: border }}>{k}</div>
            <div style={{ padding: "10px 0", borderBottom: border, fontSize: 14 }}>{v}</div>
          </div>
        );
      })}
    </div>
  );
}

const codeBlock: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12.5,
  lineHeight: 1.75,
  background: "var(--color-ink)",
  color: "#C6CEDA",
  padding: "18px 20px",
  overflowX: "auto",
  margin: 0,
  whiteSpace: "pre",
};
