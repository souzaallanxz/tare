import Link from "next/link";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { MarketingFooter, MarketingNav } from "../_marketing/chrome";

export const metadata = {
  title: "Tare — Pricing",
  description: "Priced by workspace count and spend band. Never by seats.",
};

export default function PricingPage() {
  return (
    <div className="max-w-[1060px] mx-auto px-7">
      <MarketingNav />

      <header className="pt-16 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[.14em] text-muted mb-3">Pricing</p>
        <h1 className="text-[42px] font-medium tracking-[-.028em] leading-[1.08]">
          By workspace and spend band. Never by seats.
        </h1>
        <p className="text-muted text-[17px] max-w-[62ch] mt-4">
          Billed annually or monthly. Every tier includes the €1,500 assessment credit
          against the first year.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-px bg-rule border border-rule mb-16">
        <Tier
          name="Starter"
          price="€400"
          cadence="per month"
          for="One workspace, one team."
          rows={[
            "1 workspace",
            "Daily ingestion (3-day re-read)",
            "Attribution engine",
            "6 detection rules + 3 heuristics",
            "Weekly report email",
            "Savings ledger",
            "CSV export from Ledger",
          ]}
        />
        <Tier
          name="Team"
          price="€900"
          cadence="per month · billed annually"
          for="Multi-team workspaces."
          highlighted
          rows={[
            "Up to 5 workspaces",
            "Everything in Starter",
            "Budgets and thresholds",
            "Owner mapping + attribution rules",
            "Monthly CFO PDF",
            "Anomaly detection surfaced per entity",
            "Rate card upload (billed reclassification)",
          ]}
        />
        <Tier
          name="Scale"
          price="€1,500+"
          cadence="per month · billed annually"
          for="Multi-workspace, security review required."
          rows={[
            "Unlimited workspaces",
            "SSO",
            "Cloud infra cost connector (Azure/AWS)",
            "Custom attribution rules",
            "Audit log surfacing",
            "Priority incident response",
            "DPA + security questionnaire support",
          ]}
        />
      </section>

      <section className="bg-surface border border-rule p-8 mb-16">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-[52ch]">
            <p className="font-mono text-[11px] uppercase tracking-[.14em] text-muted mb-2">Assessment wedge</p>
            <h2 className="text-[24px] font-medium tracking-[-.018em]">€1,500 · one-off · 90 days of history</h2>
            <p className="text-muted mt-3">
              Same pipeline as the subscription, run once, delivered as one written report inside
              five business days. If you subscribe, the €1,500 is credited against the first year.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost"><Link href="/sample">Sample report</Link></Button>
            <Button asChild><Link href="/assessment">Request one</Link></Button>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-[26px] font-medium tracking-[-.018em] mb-6">Common questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Faq
            q="Why isn't there a per-seat option?"
            a="The value scales with workspace count and spend band, not with people staring at dashboards. Sharing the login with Finance is free."
          />
          <Faq
            q="Do you resell or store our billing data?"
            a="No. Aggregated system-catalog rows live in your tenant only. No third-party analytics, no data sharing, no telemetry that includes euro amounts."
          />
          <Faq
            q="What happens if a saving is not verified?"
            a="It transitions to not_observed with the reason. Nothing gets added to the confirmed total unless the invoice actually moved."
          />
          <Faq
            q="Can I run this against a test workspace first?"
            a="Yes. The assessment covers exactly that path — one workspace, 90 days, no live connection required if you can export system.billing.usage."
          />
          <Faq
            q="Where does my data live?"
            a="Neon (Frankfurt) + Vercel (Frankfurt). No leg outside the EU. Full residency table on the security section of the landing page."
          />
          <Faq
            q="What if we don't have contracted DBU rates to share?"
            a="Everything reads as estimated until you upload a rate card. The product is designed to be useful in that mode — attribution and honesty do not depend on knowing the exact rate."
          />
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function Tier({
  name,
  price,
  cadence,
  for: forWho,
  rows,
  highlighted = false,
}: {
  name: string;
  price: string;
  cadence: string;
  for: string;
  rows: readonly string[];
  highlighted?: boolean;
}) {
  return (
    <div className={`bg-surface p-8 ${highlighted ? "ring-2 ring-ink -m-px relative" : ""}`}>
      {highlighted && (
        <div className="absolute top-3 right-3">
          <Badge variant="ink">recommended</Badge>
        </div>
      )}
      <p className="font-mono text-[11px] uppercase tracking-[.14em] text-muted">{name}</p>
      <p className="font-mono text-[32px] font-medium tabular-nums tracking-[-.03em] mt-2">{price}</p>
      <p className="text-muted text-[12.5px]">{cadence}</p>
      <p className="text-[14px] mt-4">{forWho}</p>
      <ul className="mt-6 space-y-2 text-[14px]">
        {rows.map((row) => (
          <li key={row} className="text-muted">— {row}</li>
        ))}
      </ul>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="bg-surface border border-rule p-6">
      <h3 className="text-[16px] font-medium mb-2">{q}</h3>
      <p className="text-muted text-[14px]">{a}</p>
    </div>
  );
}
