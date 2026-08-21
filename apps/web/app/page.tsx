import Link from "next/link";
import { Lockup } from "../components/logo";
import { Money } from "../components/money";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { SpendBar } from "../components/spend-bar";
import { FIXTURE } from "../lib/fixtures";
import { MarketingNav, MarketingFooter } from "./_marketing/chrome";

const GRANTS = `GRANT USE CATALOG ON CATALOG system          TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.billing   TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.compute   TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.lakeflow  TO \`tare-service-principal\`;
GRANT SELECT ON SCHEMA      system.query     TO \`tare-service-principal\`;`;

const REVOKE = `REVOKE USE CATALOG ON CATALOG system FROM \`tare-service-principal\`;`;

export default function MarketingPage() {
  return (
    <div className="max-w-[1060px] mx-auto px-7">
      <MarketingNav />

      {/* Hero */}
      <section className="pt-20 pb-14 grid grid-cols-1 lg:grid-cols-[1.02fr_.98fr] gap-14 items-start">
        <div>
          <h1 className="text-[46px] font-medium leading-[1.06] tracking-[-.03em] mb-5">
            Your Databricks bill, explained line by line.
          </h1>
          <p className="text-[17px] text-muted max-w-[45ch] mb-6">
            Every euro tied to a team, a job and a decision. Estimates marked as estimates.
            Savings verified against the next invoice before anyone counts them.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/assessment">Request an assessment</Link></Button>
            <Button asChild variant="ghost" size="lg"><Link href="/sample">Read a sample report</Link></Button>
          </div>
          <p className="text-muted text-[13px] mt-4">
            €1,500 one-off. Delivered in 5 business days. Credited against the first year of subscription.
          </p>
        </div>

        <div className="bg-surface border border-rule p-6">
          <div className="font-mono text-[11px] uppercase tracking-[.12em] text-muted mb-4">
            Workspace · {FIXTURE.workspace} · {FIXTURE.period}
          </div>
          <SpendBar
            billedMinor={FIXTURE.billedMinor}
            forecastMinor={FIXTURE.forecastMinor}
            budgetMinor={FIXTURE.budgetMinor}
          />
          <Row label="Billed to date">
            <Money amount={FIXTURE.billedMinor} basis="billed" />
          </Row>
          <Row label="Forecast, month end">
            <Money amount={FIXTURE.forecastMinor} basis="estimated" />
          </Row>
          <Row label="Spend with no owner">
            <span className="font-mono text-[13px] tabular-nums">{FIXTURE.unattributedPct.toFixed(1)}%</span>
          </Row>
        </div>
      </section>

      {/* Why Tare */}
      <section id="why" className="py-16 border-t border-rule">
        <p className="font-mono text-[11px] uppercase tracking-[.14em] text-muted mb-3">Why Tare</p>
        <h2 className="text-[32px] font-medium tracking-[-.022em] leading-[1.15] mb-4">
          Databricks tells you how much. Tare tells you why.
        </h2>
        <p className="text-muted max-w-[62ch] mb-10">
          The system catalog already carries every fact you need. The gaps are attribution,
          verification and a record that survives until the renewal conversation.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Value
            eyebrow="Attribution"
            title="Every euro has an owner."
            body="Tag, job owner, cluster creator, query user, manual assignment — resolved in priority order. Whatever no rule matches becomes a headline metric, not a footnote."
          />
          <Value
            eyebrow="Honesty"
            title="Estimates always say so."
            body="Contracted rates land as billed. Everything else — list price, cloud infra without a connector, projections — carries the estimated marker in the data model and on the screen."
          />
          <Value
            eyebrow="Proof"
            title="Savings are a fact with a date."
            body="A recommendation is a suggestion. A saving is invoice-verified over the following 28 days. When the fix does not land, the ledger says so — and that is the reason customers trust the green numbers."
          />
          <Value
            eyebrow="Narrative"
            title="One weekly email, three things."
            body="Ranked. One sentence per item. Priced in the same currency as your contract. A cost break, a confirmed saving, a budget projection — anything else waits."
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-16 border-t border-rule">
        <p className="font-mono text-[11px] uppercase tracking-[.14em] text-muted mb-3">How it works</p>
        <h2 className="text-[32px] font-medium tracking-[-.022em] mb-10">
          Read-only in five lines. Reversible in one.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Step
            n="01"
            title="Connect"
            body="Create an OAuth service principal named tare-service-principal. Paste the client ID and secret into the connection screen — the secret is envelope-encrypted before it hits the database."
          />
          <Step
            n="02"
            title="Grant"
            body="Five GRANT statements against the system catalog. No table data, no query text, no results — ever. The grants below are the exact set the security reviewer will see."
          />
          <Step
            n="03"
            title="Ingest"
            body="Daily incremental pull with a three-day re-read window. Attribution, rules and verification run on every pass. First backfill covers 90 days and takes about ten minutes."
          />
        </div>

        <pre className="mt-8 font-mono text-[12.5px] leading-[1.75] bg-ink text-[#C6CEDA] px-5 py-4 overflow-x-auto whitespace-pre">
          {GRANTS}
        </pre>
      </section>

      {/* Native vs Tare */}
      <section className="py-16 border-t border-rule">
        <p className="font-mono text-[11px] uppercase tracking-[.14em] text-muted mb-3">Positioning</p>
        <h2 className="text-[32px] font-medium tracking-[-.022em] mb-3">
          Same source. Different surface.
        </h2>
        <p className="text-muted max-w-[62ch] mb-8">
          Databricks ships free system-table dashboards. Raw charts are commodity — the work is
          what happens after the chart.
        </p>

        <div className="border border-rule bg-surface">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-rule">
                <th className="text-left font-mono text-[11px] uppercase tracking-[.12em] text-muted px-4 py-3">Layer</th>
                <th className="text-left font-mono text-[11px] uppercase tracking-[.12em] text-muted px-4 py-3">Databricks native</th>
                <th className="text-left font-mono text-[11px] uppercase tracking-[.12em] text-muted px-4 py-3">Tare</th>
              </tr>
            </thead>
            <tbody>
              <ComparisonRow layer="Data"        native="System tables, free"                   tare="Same source — no advantage claimed." />
              <ComparisonRow layer="Attribution" native="Tag-based, incomplete"                 tare="Rules engine. Unattributed spend is the first metric on the screen." />
              <ComparisonRow layer="Honesty"     native="Everything shown as one number"       tare="Billed and estimated separated everywhere, structurally." />
              <ComparisonRow layer="Narrative"   native="Dashboards to interpret"              tare="One weekly email, ranked, one sentence per item." />
              <ComparisonRow layer="Proof"       native="None"                                  tare="Savings ledger: recommendation → applied → verified against billing → confirmed." last />
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 border-t border-rule">
        <p className="font-mono text-[11px] uppercase tracking-[.14em] text-muted mb-3">Pricing</p>
        <h2 className="text-[32px] font-medium tracking-[-.022em] mb-3">
          By workspace and spend band, never by seats.
        </h2>
        <p className="text-muted max-w-[62ch] mb-10">
          Billed annually or monthly. Assessment credited against the first year.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-rule border border-rule mb-6">
          <PricingTier
            name="Starter"
            price="€400 / mo"
            includes={[
              "1 workspace",
              "Daily ingestion",
              "Weekly report",
              "Savings ledger",
            ]}
          />
          <PricingTier
            name="Team"
            price="€900 / mo"
            includes={[
              "Up to 5 workspaces",
              "Budgets and alerts",
              "Owner mapping",
              "Monthly CFO PDF",
            ]}
            highlighted
          />
          <PricingTier
            name="Scale"
            price="€1,500+ / mo"
            includes={[
              "Unlimited workspaces",
              "SSO",
              "Cloud infra cost connector",
              "Custom attribution rules",
            ]}
          />
        </div>

        <div className="border border-rule bg-surface p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[.14em] text-muted">Assessment wedge</p>
            <p className="text-[20px] font-medium mt-1">€1,500 one-off · 90 days of history · one written report</p>
            <p className="text-muted text-[13px] mt-1">Credited against the first year of any subscription tier.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm"><Link href="/sample">See the sample</Link></Button>
            <Button asChild size="sm"><Link href="/assessment">Request an assessment</Link></Button>
          </div>
        </div>

        <p className="text-muted text-[13px] mt-6">
          <Link href="/pricing" className="underline">See the full pricing detail →</Link>
        </p>
      </section>

      {/* Security */}
      <section id="security" className="py-16 border-t border-rule scroll-mt-6">
        <p className="font-mono text-[11px] uppercase tracking-[.14em] text-muted mb-3">Security and access</p>
        <h2 className="text-[32px] font-medium tracking-[-.022em] mb-3">
          What Tare is allowed to read.
        </h2>
        <p className="text-muted text-[16px] max-w-[62ch] mb-8">
          Read-only, aggregates only, scoped to the <span className="font-mono">system</span> catalog.
          Never your tables, your query text, or your results. Revoked in one statement.
        </p>

        <SubHead>The exact grants</SubHead>
        <pre className="font-mono text-[12.5px] leading-[1.75] bg-ink text-[#C6CEDA] px-5 py-4 overflow-x-auto whitespace-pre">
          {GRANTS}
        </pre>

        <SubHead>Residency</SubHead>
        <Kv rows={[
          ["Application",   "Vercel · EU (Frankfurt)"],
          ["Database",      "Neon · EU (Frankfurt)"],
          ["Object storage","EU only"],
          ["Auth tokens",   "Never persisted (in-memory)"],
          ["Backups",       "Neon PITR, EU region"],
        ]} />

        <SubHead>Certifications</SubHead>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="overrun">no SOC 2 yet</Badge>
          <span className="text-muted text-[14px]">DPA available before signature</span>
        </div>
        <p className="text-muted text-[14px] mt-4 max-w-[70ch]">
          If your security review requires a current SOC 2 report, this is not yet the right year to buy.
          Everything else — EU residency, read-only aggregates, revocable access, published grant list — holds today.
        </p>

        <SubHead>Ending access</SubHead>
        <p className="text-muted max-w-[70ch] mb-3">
          One statement in your workspace ends all access immediately. Tare keeps aggregates already
          ingested until you delete the tenant.
        </p>
        <pre className="font-mono text-[12.5px] leading-[1.75] bg-ink text-[#C6CEDA] px-5 py-4 overflow-x-auto whitespace-pre">
          {REVOKE}
        </pre>
      </section>

      {/* Closing CTA */}
      <section className="py-16 border-t border-rule">
        <div className="bg-ink text-white px-10 py-14 flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-[42ch]">
            <p className="font-mono text-[11px] uppercase tracking-[.14em] text-white/60 mb-3">Start with the wedge</p>
            <h3 className="text-[26px] font-medium tracking-[-.02em] leading-tight">
              A €1,500 assessment. One written report. Delivered in five business days.
            </h3>
          </div>
          <Button asChild size="lg" variant="ghost" className="border-white text-white hover:bg-white/10">
            <Link href="/assessment">Request an assessment</Link>
          </Button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline py-2.5 border-t border-rule">
      <span>{label}</span>
      {children}
    </div>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[17px] font-medium mt-8 mb-3">{children}</h3>;
}

function Kv({ rows }: { rows: readonly [string, string][] }) {
  return (
    <div className="grid grid-cols-[220px_1fr]">
      {rows.map(([k, v], i, a) => {
        const border = i === a.length - 1 ? "" : "border-b border-rule";
        return (
          <div key={k} className="contents">
            <div className={`py-2.5 pt-3 font-mono text-[11px] uppercase tracking-[.12em] text-muted ${border}`}>{k}</div>
            <div className={`py-2.5 text-[14px] ${border}`}>{v}</div>
          </div>
        );
      })}
    </div>
  );
}

function Value({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="bg-surface border border-rule p-6">
      <p className="font-mono text-[11px] uppercase tracking-[.14em] text-muted">{eyebrow}</p>
      <h3 className="text-[19px] font-medium tracking-[-.01em] mt-2 mb-3">{title}</h3>
      <p className="text-muted text-[14.5px] max-w-[46ch]">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-mono text-[13px] text-muted mb-2">{n}</p>
      <h3 className="text-[19px] font-medium tracking-[-.01em] mb-3">{title}</h3>
      <p className="text-muted text-[14.5px]">{body}</p>
    </div>
  );
}

function ComparisonRow({
  layer,
  native,
  tare,
  last = false,
}: {
  layer: string;
  native: string;
  tare: string;
  last?: boolean;
}) {
  const cls = last ? "" : "border-b border-rule";
  return (
    <tr className={cls}>
      <td className="px-4 py-3 font-medium align-top">{layer}</td>
      <td className="px-4 py-3 text-muted align-top">{native}</td>
      <td className="px-4 py-3 align-top">{tare}</td>
    </tr>
  );
}

function PricingTier({
  name,
  price,
  includes,
  highlighted = false,
}: {
  name: string;
  price: string;
  includes: readonly string[];
  highlighted?: boolean;
}) {
  return (
    <div className={`bg-surface p-6 ${highlighted ? "ring-2 ring-ink -m-px" : ""}`}>
      <p className="font-mono text-[11px] uppercase tracking-[.14em] text-muted">{name}</p>
      <p className="font-mono text-[22px] font-medium tabular-nums tracking-[-.02em] mt-2">{price}</p>
      <ul className="mt-4 space-y-1.5 text-[14px] text-muted">
        {includes.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
