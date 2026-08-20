import { withTenant } from "@tare/db";
import { getConnection, type ConnectionStatus } from "@tare/db/repositories";
import { AppShell } from "../../components/shell";
import { Money } from "../../components/money";
import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Card, CardBody, CardHeader, CardHint, CardTitle } from "../../components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
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
      <PageHeader
        title="Connection"
        description="Four steps. Read-only throughout, and revocable in one statement."
        actions={<StatusPill status={conn?.status ?? null} message={conn?.statusMessage ?? null} />}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>1 · Save the service principal</CardTitle>
          <CardHint>Secret is envelope-encrypted before it hits the database</CardHint>
        </CardHeader>
        <CardBody>
          <p className="text-muted mb-3.5 max-w-[72ch]">
            Create an OAuth machine-to-machine service principal named{" "}
            <span className="font-mono">tare-service-principal</span>, generate a secret, and paste it
            here. The secret is sealed with a per-connection data key and only opened in memory during a run.
          </p>
          <ConnectForm
            initial={{
              host: conn?.host ?? "",
              clientId: conn?.clientId ?? "",
              warehouseId: conn?.warehouseId ?? null,
              hasSecret: Boolean(conn),
            }}
          />
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>2 · Grant read access to the system catalog</CardTitle>
          <CardHint>Nothing beyond these five lines</CardHint>
        </CardHeader>
        <CardBody>
          <pre className="font-mono text-[12.5px] leading-[1.75] bg-ink text-[#C6CEDA] px-5 py-4 overflow-x-auto m-0 whitespace-pre">
            {GRANTS}
          </pre>
          <p className="text-muted text-[13px] mt-3.5">
            Optional, for savings verification:{" "}
            <span className="font-mono">SELECT ON SCHEMA system.access</span>.
          </p>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>3 · Pick a SQL warehouse</CardTitle>
          <CardHint>Queries run on your compute, billed to you</CardHint>
        </CardHeader>
        <Table>
          <THead>
            <TR>
              <TH className="w-10" />
              <TH>Warehouse</TH>
              <TH>Size</TH>
              <TH>State</TH>
              <TH className="text-right">Typical daily cost of Tare</TH>
            </TR>
          </THead>
          <TBody>
            <TR>
              <TD>○</TD>
              <TD className="font-mono">bi-warehouse</TD>
              <TD className="font-mono">Small</TD>
              <TD className="text-muted text-[13px]">Running</TD>
              <TD className="text-right"><Money amount={40} basis="estimated" /></TD>
            </TR>
            <TR>
              <TD>○</TD>
              <TD className="font-mono">ops-serverless</TD>
              <TD className="font-mono">2X-Small</TD>
              <TD className="text-muted text-[13px]">Stopped</TD>
              <TD className="text-right"><Money amount={25} basis="estimated" /></TD>
            </TR>
          </TBody>
        </Table>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4 · Development shortcut</CardTitle>
          <CardHint>No workspace yet</CardHint>
        </CardHeader>
        <CardBody>
          <p className="text-muted max-w-[72ch] m-0">
            Set <span className="font-mono">USE_FAKE_INGEST=1</span> in the environment. &ldquo;Start
            ingestion&rdquo; will populate the DB with deterministic synthetic data so the rest of the
            product is exercisable end-to-end. Numbers are not calibrated — do not read them as findings.
          </p>
        </CardBody>
      </Card>
    </AppShell>
  );
}

const LABEL: Record<ConnectionStatus, { text: string; variant: "muted" | "recovered" | "threshold" | "overrun" }> = {
  pending:      { text: "pending",       variant: "muted" },
  ok:           { text: "connected",     variant: "recovered" },
  auth_failed:  { text: "auth failed",   variant: "overrun" },
  permission:   { text: "grant missing", variant: "overrun" },
  schema_drift: { text: "schema drift",  variant: "overrun" },
  quota:        { text: "quota",         variant: "threshold" },
  error:        { text: "error",         variant: "overrun" },
};

function StatusPill({ status, message }: { status: ConnectionStatus | null; message: string | null }) {
  if (!status) return <Badge variant="overrun" dot>not connected</Badge>;
  const cfg = LABEL[status];
  return (
    <span className="flex flex-wrap items-center gap-2.5">
      <Badge variant={cfg.variant} dot>{cfg.text}</Badge>
      {message ? <span className="text-muted text-[12px] font-mono">{message}</span> : null}
    </span>
  );
}
