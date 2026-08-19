import { AppShell } from "../../components/shell";
import { renderWeeklyReport } from "@tare/email";
import { FIXTURE } from "../../lib/fixtures";

export default function ReportPage() {
  const html = renderWeeklyReport({
    tenantName: "Acme Data",
    workspace: FIXTURE.workspace,
    weekLabel: "Mon 24 Aug",
    currency: "EUR",
    ingestedAt: FIXTURE.ingestedAt,
    confirmedLifetimeMinor: FIXTURE.lifetimeConfirmedMinor,
    items: [
      {
        headline: "A warehouse with no owner has run hot for nine days.",
        detail: "ad-hoc-sql · 3.1× its 28-day baseline · billed",
        amountMinor: 4_120_00,
        basis: "billed",
        tone: "up",
      },
      {
        headline: "July's compute-type fix is holding.",
        detail: "nightly-ingest · confirmed against the invoice",
        amountMinor: 1_240_00,
        basis: "billed",
        tone: "down",
      },
      {
        headline: "You will reach 94.5% of budget by the 31st.",
        detail: "Estimated from the current run rate",
        amountMinor: FIXTURE.forecastMinor,
        basis: "estimated",
        tone: "neutral",
      },
    ],
  });

  return (
    <AppShell active="report">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 className="display">Weekly report</h1>
          <p className="mut" style={{ margin: "6px 0 0" }}>
            640 px, table layout, no web fonts. It has to survive Outlook.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="sel">Recipients: 3 ⌄</button>
          <button className="btn ghost s">Send a test to me</button>
        </div>
      </div>

      <section className="panel">
        <header>
          <span className="title">Monday 24 August, 07:00 CET</span>
          <span className="label">Estimated marker carries the word as well as the colour</span>
        </header>
        <div
          className="pad"
          style={{ background: "var(--color-paper)" }}
          // Preview the exact HTML that goes out. Safe: html is our own template, no user input.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </section>
    </AppShell>
  );
}
