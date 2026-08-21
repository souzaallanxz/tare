import { withTenant } from "@tare/db";
import { getConnection, type ConnectionStatus } from "@tare/db/repositories";
import { AppShell } from "../../components/shell";
import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Card, CardBody, CardHeader, CardHint, CardTitle } from "../../components/ui/card";
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
          <CardTitle>Or start from a CSV export</CardTitle>
          <CardHint>Assessment path — no live workspace needed</CardHint>
        </CardHeader>
        <CardBody>
          <p className="text-muted max-w-[72ch] mb-3">
            Export <span className="font-mono">system.billing.usage</span> once, walk it through the whole
            product, decide whether a live connection is worth the security review.
          </p>
          <a href="/import" className="underline">Open the import screen →</a>
        </CardBody>
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
