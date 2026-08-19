import Link from "next/link";
import { Lockup } from "../../components/logo";
import { Money } from "../../components/money";
import { SpendBar } from "../../components/spend-bar";
import { BasisPill } from "../../components/pills";
import { FIXTURE } from "../../lib/fixtures";

export default function SampleReportPage() {
  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "20px 28px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0" }}>
        <Link href="/"><Lockup /></Link>
        <div style={{ display: "flex", gap: 12 }}>
          <Link className="mut" href="/">Back to the site</Link>
          <Link className="btn s" href="/login">Log in</Link>
        </div>
      </div>

      <p className="label" style={{ margin: "20px 0 14px" }}>Sample · anonymised · page 1 of 12</p>

      <article style={{ background: "var(--color-surface)", border: "1px solid var(--color-rule)" }}>
        <div style={{ padding: "44px 48px", borderBottom: "1px solid var(--color-rule)" }}>
          <Lockup />
          <h1 style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-.025em", margin: "22px 0 10px", lineHeight: 1.15 }}>
            Cost assessment<br />Acme Data · 90 days to 23 August 2026
          </h1>
          <p className="mut" style={{ fontSize: 14.5, maxWidth: "62ch" }}>
            Prepared from read-only access to the system catalog of one workspace. No table data, query text
            or results were read.
          </p>
        </div>

        <div style={{ padding: "34px 48px", borderBottom: "1px solid var(--color-rule)" }}>
          <h3 style={{ fontSize: 17, fontWeight: 500, margin: "0 0 12px" }}>1 · What the invoice does not separate</h3>
          <p className="mut" style={{ fontSize: 14.5, maxWidth: "62ch", marginTop: 0 }}>
            Two entities account for €20,210.63 of August spend and belong to nobody: a SQL warehouse used
            interactively across three teams, and a shared all-purpose cluster with no autotermination.
          </p>
          <div style={{ marginTop: 20 }}>
            <SpendBar billedMinor={FIXTURE.billedMinor} forecastMinor={FIXTURE.forecastMinor} budgetMinor={FIXTURE.budgetMinor} />
          </div>
        </div>

        <div style={{ padding: "34px 48px" }}>
          <h3 style={{ fontSize: 17, fontWeight: 500, margin: "0 0 12px" }}>2 · Four findings, ranked by amount</h3>
          <table>
            <thead>
              <tr><th>Finding</th><th>Entity</th><th>Basis</th><th className="n">Per month</th></tr>
            </thead>
            <tbody>
              <tr><td>Cost break, unexplained</td><td className="data">ad-hoc-sql</td><td><BasisPill basis="billed" /></td><td className="n"><Money amount={4_120_00} basis="billed" tone="up" /></td></tr>
              <tr><td>No autotermination</td><td className="data">shared-interactive</td><td><BasisPill basis="billed" /></td><td className="n"><Money amount={880_40} basis="billed" /></td></tr>
              <tr><td>Idle SQL warehouse</td><td className="data">bi-warehouse</td><td><BasisPill basis="billed" /></td><td className="n"><Money amount={610_00} basis="billed" /></td></tr>
              <tr><td>Instance-type mismatch</td><td className="data">ml-training</td><td><BasisPill basis="estimated" /></td><td className="n"><Money amount={430_00} basis="estimated" /></td></tr>
            </tbody>
          </table>
        </div>
      </article>

      <div style={{ textAlign: "center", marginTop: 26 }}>
        <Link className="btn" href="/overview">See these numbers in the product</Link>
      </div>
    </div>
  );
}
