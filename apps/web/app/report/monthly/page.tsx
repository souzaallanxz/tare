import { Lockup } from "../../../components/logo";
import { Money } from "../../../components/money";
import { BasisPill } from "../../../components/pills";
import { buildMonthlyReport } from "../../../lib/monthly-report";
import { requireSession } from "../../../lib/session";
import { PrintOnLoad } from "./print-on-load";
import "./print.css";

type Search = Record<string, string | string[] | undefined>;

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const period = (typeof sp["period"] === "string" ? sp["period"] : null) ?? currentMonth();
  const printFlag = sp["print"] === "1";
  const report = await buildMonthlyReport(
    session.activeTenant.id,
    session.activeTenant.name,
    session.activeTenant.currency as "EUR" | "USD",
    period,
  );

  const budgetPct =
    report.budgetMinor && report.budgetMinor > 0
      ? (report.billedMinor / report.budgetMinor) * 100
      : null;

  return (
    <div className="mx-auto max-w-[820px] p-10 print:p-0 print:max-w-none">
      {printFlag ? <PrintOnLoad /> : null}
      <div className="flex items-start justify-between mb-8 print:mb-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[.12em] text-muted mb-2">
            Monthly report · {report.period}
          </p>
          <h1 className="text-[30px] font-medium tracking-[-.02em] leading-tight">
            {report.tenantName}
          </h1>
        </div>
        <Lockup />
      </div>

      <section className="mb-8">
        <div className="grid grid-cols-3 gap-px bg-rule border border-rule">
          <Stat
            label="Billed to date"
            value={<Money amount={report.billedMinor} basis={report.billedBasis} currency={report.currency} />}
          />
          <Stat
            label="Confirmed savings"
            value={
              <Money
                amount={report.confirmedSavingsMinor}
                basis="billed"
                currency={report.currency}
                tone="down"
              />
            }
          />
          <Stat
            label="Unattributed"
            value={`${report.unattributedPct.toFixed(1)}%`}
            hint={<Money amount={report.unattributedMinor} basis="billed" currency={report.currency} />}
          />
        </div>
      </section>

      <Section title="Spend by owner">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-rule">
              <th className="text-left font-mono text-[11px] uppercase tracking-[.12em] text-muted py-2">Owner</th>
              <th className="text-right font-mono text-[11px] uppercase tracking-[.12em] text-muted py-2">Spend</th>
              <th className="text-right font-mono text-[11px] uppercase tracking-[.12em] text-muted py-2">Share</th>
            </tr>
          </thead>
          <tbody>
            {report.ownerRows.map((r) => (
              <tr key={r.name} className="border-b border-rule last:border-b-0">
                <td className="py-2">{r.name}</td>
                <td className="py-2 text-right">
                  <Money amount={r.spendMinor} basis="billed" currency={report.currency} />
                </td>
                <td className="py-2 text-right font-mono tabular-nums">{r.pct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Confirmed savings">
        {report.savingsRows.length === 0 ? (
          <p className="text-muted">No confirmations closed in this month.</p>
        ) : (
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-rule">
                <th className="text-left font-mono text-[11px] uppercase tracking-[.12em] text-muted py-2">Confirmed</th>
                <th className="text-left font-mono text-[11px] uppercase tracking-[.12em] text-muted py-2">Rule</th>
                <th className="text-left font-mono text-[11px] uppercase tracking-[.12em] text-muted py-2">Entity</th>
                <th className="text-right font-mono text-[11px] uppercase tracking-[.12em] text-muted py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {report.savingsRows.map((r, i) => (
                <tr key={i} className="border-b border-rule last:border-b-0">
                  <td className="py-2 font-mono text-muted">{r.confirmedAt}</td>
                  <td className="py-2">{r.rule}</td>
                  <td className="py-2">{r.entity ?? "workspace"}</td>
                  <td className="py-2 text-right">
                    <Money amount={r.amountMinor} basis="billed" currency={report.currency} tone="down" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Open findings" hint="Top 10 by impact">
        {report.openFindings.length === 0 ? (
          <p className="text-muted">Nothing open.</p>
        ) : (
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-rule">
                <th className="text-left font-mono text-[11px] uppercase tracking-[.12em] text-muted py-2">Rule</th>
                <th className="text-left font-mono text-[11px] uppercase tracking-[.12em] text-muted py-2">Entity</th>
                <th className="text-left font-mono text-[11px] uppercase tracking-[.12em] text-muted py-2">State</th>
                <th className="text-right font-mono text-[11px] uppercase tracking-[.12em] text-muted py-2">Impact</th>
                <th className="text-left font-mono text-[11px] uppercase tracking-[.12em] text-muted py-2">Basis</th>
              </tr>
            </thead>
            <tbody>
              {report.openFindings.map((r, i) => (
                <tr key={i} className="border-b border-rule last:border-b-0">
                  <td className="py-2">{r.rule}</td>
                  <td className="py-2">{r.entity ?? "workspace"}</td>
                  <td className="py-2 capitalize">{r.state}</td>
                  <td className="py-2 text-right">
                    <Money
                      amount={r.impactMinor}
                      basis={r.impactBasis ?? "billed"}
                      currency={report.currency}
                    />
                  </td>
                  <td className="py-2">
                    {r.impactBasis ? <BasisPill basis={r.impactBasis} /> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {budgetPct !== null && (
        <Section title="Against budget">
          <p className="text-[14px]">
            Monthly limit €{(report.budgetMinor! / 100).toLocaleString("en-IE", { maximumFractionDigits: 0 })}.
            Billed to date is {budgetPct.toFixed(1)}% of the limit.
          </p>
        </Section>
      )}

      <footer className="mt-10 pt-6 border-t border-rule text-[12px] text-muted font-mono">
        Data ingested {new Date(report.ingestedAt).toISOString().slice(0, 16).replace("T", " ")} UTC.
        Values marked <span className="text-estimated">estimated</span> are derived, not invoice figures.
        <span className="print-page-controls print:hidden ml-3">
          · <a href={`?period=${report.period}&print=1`} className="underline">Open print dialog</a>
        </span>
      </footer>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 print:mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[18px] font-medium tracking-[-.01em]">{title}</h2>
        {hint ? <span className="font-mono text-[11px] uppercase tracking-[.12em] text-muted">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="bg-surface p-4">
      <div className="font-mono text-[11px] uppercase tracking-[.12em] text-muted">{label}</div>
      <div className="font-mono font-medium text-[20px] tabular-nums mt-1">{value}</div>
      {hint ? <div className="text-[12px] text-muted mt-1">{hint}</div> : null}
    </div>
  );
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
