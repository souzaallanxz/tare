import { withTenant } from "@tare/db";
import { getConnection, type ConnectionStatus } from "@tare/db/repositories";
import { AppShell } from "../../components/shell";
import { Pill } from "../../components/pills";
import { requireSession } from "../../lib/session";
import { ConnectForm } from "./connect-form";

const GRANTS = `GRANT USE CATALOG ON CATALOG system          TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.billing   TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.compute   TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.lakeflow  TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.query     TO \`tare-service-principal\`;`;

export default async function ConnectPage() {
  const session = await requireSession();
  const conn = await withTenant(session.activeTenant.id, (ctx) => getConnection(ctx));

  return (
    <AppShell active="connect" session={session}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 className="display">Connection</h1>
          <p className="mut" style={{ margin: "6px 0 0" }}>
            Four steps. Read-only throughout, and revocable in one statement.
          </p>
        </div>
        <StatusPill status={conn?.status ?? null} message={conn?.statusMessage ?? null} />
      </div>

      <section className="panel">
        <header>
          <span className="title">1 · Save the service principal</span>
          <span className="label">Secret is envelope-encrypted before it hits the database</span>
        </header>
        <div className="pad">
          <p className="mut" style={{ margin: "0 0 14px", maxWidth: "72ch" }}>
            Create an OAuth machine-to-machine service principal named{" "}
            <span className="data">tare-service-principal</span>, generate a secret, and paste it here.
            The secret is sealed with a per-connection data key and only opened in memory during a run.
          </p>
          <ConnectForm
            initial={{
              host: conn?.host ?? "",
              clientId: conn?.clientId ?? "",
              warehouseId: conn?.warehouseId ?? null,
              hasSecret: Boolean(conn),
            }}
          />
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
          <p className="mut" style={{ fontSize: 13, marginTop: 14 }}>
            Optional, for savings verification:{" "}
            <span className="data">SELECT ON SCHEMA system.access</span>.
          </p>
        </div>
      </section>

      <section className="panel">
        <header><span className="title">3 · Development shortcut</span><span className="label">No workspace yet</span></header>
        <div className="pad">
          <p className="mut" style={{ margin: 0, maxWidth: "72ch" }}>
            Set <span className="data">USE_FAKE_INGEST=1</span> in the environment. &ldquo;Start ingestion&rdquo;
            will populate the DB with deterministic synthetic data so the rest of the product is exercisable
            end-to-end. Numbers are not calibrated to anything real — do not read them as findings.
          </p>
        </div>
      </section>
    </AppShell>
  );
}

const LABEL: Record<ConnectionStatus, { text: string; variant: "muted" | "rec" | "thr" | "ovr" }> = {
  pending:      { text: "pending",         variant: "muted" },
  ok:           { text: "connected",       variant: "rec" },
  auth_failed:  { text: "auth failed",     variant: "ovr" },
  permission:   { text: "grant missing",   variant: "ovr" },
  schema_drift: { text: "schema drift",    variant: "ovr" },
  quota:        { text: "quota",           variant: "thr" },
  error:        { text: "error",           variant: "ovr" },
};

function StatusPill({ status, message }: { status: ConnectionStatus | null; message: string | null }) {
  if (!status) return <Pill variant="ovr" dot>not connected</Pill>;
  const cfg = LABEL[status];
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <Pill variant={cfg.variant} dot>{cfg.text}</Pill>
      {message ? <span className="mut" style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>{message}</span> : null}
    </span>
  );
}
