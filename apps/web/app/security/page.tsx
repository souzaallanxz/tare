import Link from "next/link";
import { Lockup } from "../../components/logo";
import { Pill } from "../../components/pills";

const GRANTS = `GRANT USE CATALOG ON CATALOG system          TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.billing   TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.compute   TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.lakeflow  TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.query     TO \`tare-service-principal\`;`;

const REVOKE = `REVOKE USE CATALOG ON CATALOG system FROM \`tare-service-principal\`;`;

export const metadata = {
  title: "Tare — Security and access",
  description: "What Tare reads, where it lives, and how to end access.",
};

export default function SecurityPage() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0", borderBottom: "1px solid var(--color-rule)" }}>
        <Link href="/"><Lockup /></Link>
        <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 14 }}>
          <Link className="mut" href="/">Home</Link>
          <Link className="btn s" href="/login">Log in</Link>
        </div>
      </div>

      <section style={{ padding: "60px 0 40px" }}>
        <p className="label">Access and residency</p>
        <h1 style={{ fontSize: 40, fontWeight: 500, letterSpacing: "-.028em", lineHeight: 1.1, margin: "10px 0 20px" }}>
          What Tare is allowed to read.
        </h1>
        <p style={{ fontSize: 17, color: "var(--color-muted)", maxWidth: "62ch", margin: 0 }}>
          Read-only, aggregates only, scoped to the <span className="data">system</span> catalog. Tare never
          reads your tables, your query text, or your results. Access revocable in one statement.
        </p>
      </section>

      <Section title="1 · The exact grants">
        <p className="mut" style={{ maxWidth: "70ch", margin: "0 0 14px" }}>
          Nothing beyond these five lines. Each grant is scoped to a specific system schema; none of them
          touch your business data.
        </p>
        <pre style={codeBlock}>{GRANTS}</pre>
      </Section>

      <Section title="2 · Residency">
        <Kv rows={[
          ["Application", "Vercel · EU (Frankfurt)"],
          ["Database",    "Neon · EU (Frankfurt)"],
          ["Object storage (CSVs, PDFs)", "EU only"],
          ["Auth tokens", "Never persisted (in-memory)"],
          ["Backups",     "Neon PITR, EU region"],
        ]} />
      </Section>

      <Section title="3 · Data model of the trust promise">
        <p className="mut" style={{ maxWidth: "70ch", margin: 0 }}>
          Every monetary value in Tare carries a <span className="data">basis</span> — either{" "}
          <Pill variant="ink">billed</Pill> or <Pill variant="est">estimated</Pill>. Sums that mix the two
          resolve to <span className="data">estimated</span>. This is a schema-level invariant, enforced by
          constraints and a build-time test.
        </p>
      </Section>

      <Section title="4 · Certifications">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Pill variant="ovr">no SOC 2 yet</Pill>
          <span className="mut" style={{ fontSize: 14 }}>DPA available before signature</span>
        </div>
        <p className="mut" style={{ fontSize: 14, marginTop: 14, maxWidth: "70ch" }}>
          If your security review requires a current SOC 2 report, this is not yet the right year to buy.
          Everything else — EU residency, read-only aggregates, revocable access, published grant list —
          holds today.
        </p>
      </Section>

      <Section title="5 · Ending access">
        <p className="mut" style={{ maxWidth: "70ch", margin: "0 0 14px" }}>
          One statement in your workspace ends all access immediately. Tare keeps the aggregates already
          ingested until you delete the tenant.
        </p>
        <pre style={codeBlock}>{REVOKE}</pre>
      </Section>

      <footer style={{ padding: "40px 0 60px", borderTop: "1px solid var(--color-rule)", color: "var(--color-muted)", fontSize: 13 }}>
        Questions on residency, DPA text, or specific controls: reply to your onboarding thread.
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: "40px 0", borderTop: "1px solid var(--color-rule)" }}>
      <h2 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-.018em", margin: "0 0 14px" }}>{title}</h2>
      {children}
    </section>
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
