import Link from "next/link";
import { AppShell } from "../../components/shell";
import { Money } from "../../components/money";
import { BasisPill, Pill } from "../../components/pills";
import { FIXTURE } from "../../lib/fixtures";

export default function LedgerPage() {
  return (
    <AppShell active="ledger">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 className="display">Ledger</h1>
          <p className="mut" style={{ margin: "6px 0 0" }}>
            Every daily usage line, priced and attributed. 1,842 rows in this period.
          </p>
        </div>
        <button className="btn ghost s">Export CSV</button>
      </div>

      <section className="panel">
        <header>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="sel">Owner: all ⌄</button>
            <button className="sel">Kind: all ⌄</button>
            <button className="sel">Basis: all ⌄</button>
            <button className="sel">Sort: cost, high to low ⌄</button>
          </div>
          <span className="label">Filters live in the URL — the link you send opens the same screen</span>
        </header>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Entity</th><th>Kind</th><th>SKU</th><th>Owner</th>
              <th className="n">DBUs</th><th className="n">Cost</th><th>Basis</th>
            </tr>
          </thead>
          <tbody>
            {FIXTURE.ledger.map((r, i) => (
              <tr key={i}>
                <td className="data mut">{r.d}</td>
                <td style={{ fontWeight: 500 }}>{r.e}</td>
                <td className="mut" style={{ fontSize: 13 }}>{r.k}</td>
                <td className="data mut">{r.sku}</td>
                <td>{r.o ?? <Pill variant="ovr">unassigned</Pill>}</td>
                <td className="n data">{r.u === null ? "—" : r.u.toFixed(1)}</td>
                <td className="n"><Money amount={r.cMinor} basis={r.b} /></td>
                <td><BasisPill basis={r.b} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel" style={{ borderLeft: "2px solid var(--color-estimated)" }}>
        <header><span className="title">Why one line here is violet</span></header>
        <div className="pad">
          <p className="mut" style={{ maxWidth: "72ch", margin: 0 }}>
            Cloud infrastructure — virtual machines, storage, networking — never appears in the Databricks
            billing tables. Until an Azure Cost Management export is connected, that line is priced from public
            rates and reads as an estimate.{" "}
            <Link href="/connect" style={{ textDecoration: "underline" }}>Connect cloud billing</Link> and it
            moves to billed, unchanged in every other respect.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
