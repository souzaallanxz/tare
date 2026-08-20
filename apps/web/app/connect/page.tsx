import { AppShell } from "../../components/shell";
import { Money } from "../../components/money";
import { Pill } from "../../components/pills";
import { requireSession } from "../../lib/session";

const GRANTS = `GRANT USE CATALOG ON CATALOG system          TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.billing   TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.compute   TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.lakeflow  TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.query     TO \`tare-service-principal\`;`;

export default async function ConnectPage() {
  const session = await requireSession();
  return (
    <AppShell active="connect" session={session}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 className="display">Connection</h1>
          <p className="mut" style={{ margin: "6px 0 0" }}>
            Four steps. Read-only throughout, and revocable in one statement.
          </p>
        </div>
        <Pill variant="ovr" dot>not connected</Pill>
      </div>

      <section className="panel">
        <header><span className="title">1 · Create a service principal</span><span className="label">In your account console</span></header>
        <div className="pad">
          <p className="mut" style={{ margin: "0 0 14px", maxWidth: "72ch" }}>
            Create an OAuth machine-to-machine service principal named{" "}
            <span className="data">tare-service-principal</span>, generate a secret, and paste the client ID
            here. Tare never receives a personal access token and never acts as a user.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, maxWidth: 640 }}>
            <div>
              <label className="label" htmlFor="host">Workspace host</label>
              <input id="host" defaultValue="adb-0000000000000000.0.azuredatabricks.net"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-rule)", fontFamily: "var(--font-mono)", fontSize: 13, background: "var(--color-surface)" }} />
            </div>
            <div>
              <label className="label" htmlFor="cid">Client ID</label>
              <input id="cid" placeholder="00000000-0000-0000-0000-000000000000"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-rule)", fontFamily: "var(--font-mono)", fontSize: 13, background: "var(--color-surface)" }} />
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <header>
          <span className="title">2 · Grant read access to the system catalog</span>
          <span className="label">Nothing beyond these five lines</span>
        </header>
        <div className="pad">
          <pre
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              lineHeight: 1.75,
              background: "var(--color-ink)",
              color: "#C6CEDA",
              padding: "18px 20px",
              overflowX: "auto",
              margin: 0,
              whiteSpace: "pre",
            }}
          >
            {GRANTS}
          </pre>
        </div>
      </section>

      <section className="panel">
        <header>
          <span className="title">3 · Pick a SQL warehouse</span>
          <span className="label">Queries run on your compute, billed to you</span>
        </header>
        <table>
          <thead>
            <tr>
              <th></th><th>Warehouse</th><th>Size</th><th>State</th>
              <th className="n">Typical daily cost of Tare</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ width: 36 }}>○</td>
              <td className="data">bi-warehouse</td>
              <td className="data">Small</td>
              <td className="mut" style={{ fontSize: 13 }}>Running</td>
              <td className="n"><Money amount={40} basis="estimated" /></td>
            </tr>
            <tr>
              <td>○</td>
              <td className="data">ops-serverless</td>
              <td className="data">2X-Small</td>
              <td className="mut" style={{ fontSize: 13 }}>Stopped</td>
              <td className="n"><Money amount={25} basis="estimated" /></td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="panel">
        <header><span className="title">4 · Test and start</span></header>
        <div className="pad" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <p className="mut" style={{ margin: 0, maxWidth: "60ch" }}>
            The first pull reads 90 days of history and takes around ten minutes. After that, one incremental
            pull a day with a three-day re-read window, because usage records settle late.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost">Test the connection</button>
            <button className="btn">Start the first ingestion</button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
