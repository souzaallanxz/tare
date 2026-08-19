import { AppShell } from "../../components/shell";
import { Pill } from "../../components/pills";

const REVOKE = `REVOKE USE CATALOG ON CATALOG system FROM \`tare-service-principal\`;`;

export default function SettingsPage() {
  return (
    <AppShell active="settings">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 className="display">Settings</h1>
          <p className="mut" style={{ margin: "6px 0 0" }}>Rates, budgets, residency, people.</p>
        </div>
      </div>

      <section className="panel" style={{ borderLeft: "2px solid var(--color-estimated)" }}>
        <header>
          <span className="title">Rate card</span>
          <Pill variant="est">absent · list price in use</Pill>
        </header>
        <div className="pad">
          <p className="mut" style={{ maxWidth: "72ch", margin: "0 0 14px" }}>
            Without your contracted DBU rates, every cost in the product is priced at list and reads as an
            estimate. Upload the rate card and the same numbers move to billed, with no other change.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn ghost s">Upload a rate card (CSV)</button>
            <button className="btn ghost s">Connect Azure Cost Management</button>
          </div>
        </div>
      </section>

      <section className="panel">
        <header>
          <span className="title">People</span>
          <button className="btn ghost s">Invite</button>
        </header>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
          <tbody>
            <tr><td>Allan Ferreira</td><td className="data mut">allan@acme.example</td><td>Owner</td></tr>
            <tr><td>Marta Silva</td><td className="data mut">marta@acme.example</td><td>Member</td></tr>
            <tr><td>Finance</td><td className="data mut">finance@acme.example</td><td>Report recipient</td></tr>
          </tbody>
        </table>
      </section>

      <section className="panel" style={{ borderLeft: "2px solid var(--color-overrun)" }}>
        <header><span className="title">End access</span></header>
        <div className="pad">
          <p className="mut" style={{ maxWidth: "72ch", margin: "0 0 12px" }}>
            One statement in your workspace ends all access immediately. Tare keeps the aggregates already
            ingested until you delete the tenant.
          </p>
          <pre
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              background: "var(--color-ink)",
              color: "#C6CEDA",
              padding: "18px 20px",
              margin: 0,
              overflowX: "auto",
              whiteSpace: "pre",
            }}
          >
            {REVOKE}
          </pre>
        </div>
      </section>
    </AppShell>
  );
}
