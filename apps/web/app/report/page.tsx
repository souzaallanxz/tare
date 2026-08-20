import { withTenant } from "@tare/db";
import { listReportRecipients } from "@tare/db/repositories";
import { AppShell } from "../../components/shell";
import { PageHeader } from "../../components/page-header";
import { Card, CardBody, CardHeader, CardHint, CardTitle } from "../../components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
import { requireSession } from "../../lib/session";
import { renderWeeklyReportFor } from "../../lib/weekly-report";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { AddRecipientForm, RemoveRecipientButton, SendButtons } from "./controls";

export default async function ReportPage() {
  const session = await requireSession();
  const [{ html }, recipients] = await Promise.all([
    renderWeeklyReportFor(session.activeTenant.id, session.activeTenant.name),
    withTenant(session.activeTenant.id, (ctx) => listReportRecipients(ctx, "weekly")),
  ]);

  return (
    <AppShell active="report" session={session}>
      <PageHeader
        title="Weekly report"
        description="640 px, table layout, no web fonts. Survives Outlook."
        actions={
          <span className="flex gap-2 items-center">
            <Button asChild variant="ghost" size="sm">
              <Link href={{ pathname: "/report/monthly" } as never}>Monthly PDF</Link>
            </Button>
            <SendButtons />
          </span>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recipients</CardTitle>
          <CardHint>Emailed every Monday 07:00 CET</CardHint>
        </CardHeader>
        <CardBody className="border-b border-rule">
          <AddRecipientForm />
        </CardBody>
        {recipients.length === 0 ? (
          <CardBody className="text-muted">
            No recipients yet. Test sends still go to your own address.
          </CardBody>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Email</TH>
                <TH>Name</TH>
                <TH className="text-right" />
              </TR>
            </THead>
            <TBody>
              {recipients.map((r) => (
                <TR key={r.id}>
                  <TD className="font-mono">{r.email}</TD>
                  <TD>{r.name ?? <span className="text-muted">—</span>}</TD>
                  <TD className="text-right"><RemoveRecipientButton id={r.id} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardHint>What lands in the inbox</CardHint>
        </CardHeader>
        <div
          className="p-4 bg-paper"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </Card>
    </AppShell>
  );
}
