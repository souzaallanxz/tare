import Link from "next/link";
import { Badge } from "../../components/ui/badge";
import { MarketingFooter, MarketingNav } from "../_marketing/chrome";
import { AssessmentForm } from "./assessment-form";

export const metadata = {
  title: "Tare — Assessment",
  description: "€1,500 one-off. Ninety days of your Databricks bill, explained.",
};

export default function AssessmentPage() {
  return (
    <div className="max-w-[1060px] mx-auto px-7">
      <MarketingNav />

      <header className="pt-16 pb-8 grid grid-cols-1 lg:grid-cols-[1.05fr_.95fr] gap-14 items-start">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[.14em] text-muted mb-3">Assessment</p>
          <h1 className="text-[42px] font-medium tracking-[-.028em] leading-[1.08]">
            Ninety days of your bill, explained line by line.
          </h1>
          <p className="text-muted text-[17px] max-w-[52ch] mt-4">
            €1,500. Delivered in five business days. Credited against the first year of any
            subscription. Read-only throughout, revocable in one statement.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            <Badge variant="ink">One workspace</Badge>
            <Badge variant="ink">Read-only access</Badge>
            <Badge variant="ink">EU residency</Badge>
            <Badge variant="ink">Credited on subscribe</Badge>
          </div>
        </div>

        <aside className="bg-surface border border-rule p-6">
          <p className="font-mono text-[11px] uppercase tracking-[.14em] text-muted mb-3">What you get</p>
          <ul className="space-y-2 text-[14px]">
            <li>— A single written report on 90 days of usage.</li>
            <li>— Attribution: every euro tied to a team, a job, a decision.</li>
            <li>— Findings ranked by billed impact, with basis and explanation.</li>
            <li>— Verification method that will re-check any fix you apply.</li>
            <li>— A copy of the exact GRANT statements applied.</li>
          </ul>
        </aside>
      </header>

      <section className="py-8">
        <AssessmentForm />
      </section>

      <section className="py-16 border-t border-rule">
        <h2 className="text-[26px] font-medium tracking-[-.018em] mb-6">How the five days go</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Step n="Day 0" title="Reply" body="Human reply within one business day. Confirm scope, workspace host, spend band." />
          <Step n="Day 1" title="Access" body="You run five GRANT statements. Service principal secret pasted into a sealed form." />
          <Step n="Day 2" title="Ingest" body="Ninety days pulled in seven blocks. Attribution + rules run on every block." />
          <Step n="Day 3" title="Draft" body="Findings ranked, explanations drafted, sample lines cross-checked against your invoice." />
          <Step n="Day 5" title="Report" body="Written report delivered. Access can end the same day with a single REVOKE." />
        </div>
      </section>

      <section className="py-8">
        <div className="border border-rule bg-surface p-8 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-[52ch]">
            <p className="font-mono text-[11px] uppercase tracking-[.14em] text-muted">Rather see the artefact first?</p>
            <h3 className="text-[20px] font-medium mt-2">
              Read the sample assessment. Anonymised, 12 pages, structure matches the real thing.
            </h3>
          </div>
          <div className="flex gap-2 items-center">
            <Link href="/sample" className="underline">Open sample</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="bg-surface border border-rule p-4">
      <p className="font-mono text-[11px] uppercase tracking-[.14em] text-muted">{n}</p>
      <p className="font-medium text-[15px] mt-1">{title}</p>
      <p className="text-muted text-[13px] mt-2">{body}</p>
    </div>
  );
}
