import Link from "next/link";
import { AppShell } from "../../components/shell";
import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Card, CardBody, CardHeader, CardHint, CardTitle } from "../../components/ui/card";
import { requireSession } from "../../lib/session";
import { ImportForm } from "./import-form";

export default async function ImportPage() {
  const session = await requireSession();
  return (
    <AppShell active="import" session={session}>
      <PageHeader
        title="Import"
        description="Assessment path — walk one CSV export through the whole product without wiring a live workspace."
        actions={<Badge variant="estimated">usage_daily only</Badge>}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>How this differs from a live connection</CardTitle>
          <CardHint>Capabilities: usage_daily only</CardHint>
        </CardHeader>
        <CardBody>
          <p className="text-muted max-w-[72ch]">
            A CSV import supplies daily consumption. Rules that need cluster config, job timeline or query
            history will show as skipped in the ingestion summary — never run with defaults. Every cost lands
            as <span className="font-mono">estimated</span> until a rate card is uploaded in{" "}
            <Link href="/settings" className="underline">Settings</Link>.
          </p>
        </CardBody>
      </Card>

      <ImportForm />
    </AppShell>
  );
}
