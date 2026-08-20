import { withTenant } from "@tare/db";
import { listReportRecipients } from "@tare/db/repositories";
import { AppShell } from "../../components/shell";
import { requireSession } from "../../lib/session";
import { renderWeeklyReportFor } from "../../lib/weekly-report";
import { AddRecipientForm, RemoveRecipientButton, SendButtons } from "./controls";

export default async function ReportPage() {
  const session = await requireSession();
  const [{ html }, recipients] = await Promise.all([
    renderWeeklyReportFor(session.activeTenant.id, session.activeTenant.name),
    withTenant(session.activeTenant.id, (ctx) => listReportRecipients(ctx, "weekly")),
  ]);

  return (
    <AppShell active="report" session={session}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 className="display">Weekly report</h1>
          <p className="mut" style={{ margin: "6px 0 0" }}>
            640 px, table layout, no web fonts. Survives Outlook.
          </p>
        </div>
        <SendButtons />
      </div>

      <section className="panel">
        <header>
          <span className="title">Recipients</span>
          <span className="label">Emailed every Monday 07:00 CET</span>
        </header>
        <div className="pad" style={{ borderBottom: "1px solid var(--color-rule)" }}>
          <AddRecipientForm />
        </div>
        {recipients.length === 0 ? (
          <div className="pad mut">
            No recipients yet. Test sends still go to your own address.
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Email</th><th>Name</th><th className="n"></th></tr>
            </thead>
            <tbody>
              {recipients.map((r) => (
                <tr key={r.id}>
                  <td className="data">{r.email}</td>
                  <td>{r.name ?? <span className="mut">—</span>}</td>
                  <td className="n"><RemoveRecipientButton id={r.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <header>
          <span className="title">Preview</span>
          <span className="label">What lands in the inbox</span>
        </header>
        <div
          className="pad"
          style={{ background: "var(--color-paper)" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </section>
    </AppShell>
  );
}
