import { withTenant } from "@tare/db";
import { listRecommendations, savingsSummary } from "@tare/db/repositories";
import { AppShell } from "../../components/shell";
import { Money } from "../../components/money";
import { PageHeader } from "../../components/page-header";
import { BasisPill, StatePill } from "../../components/pills";
import { Card, CardBody, CardHeader, CardHint, CardTitle } from "../../components/ui/card";
import { Kpi, KpiGrid } from "../../components/ui/kpi";
import { requireSession } from "../../lib/session";
import { SweepButton, TransitionButton } from "./action-buttons";
import type { RecommendationState } from "@tare/core";

const SEQUENCE: RecommendationState[] = ["open", "accepted", "applied", "verifying", "confirmed"];

export default async function SavingsPage() {
  const session = await requireSession();
  const { recs, summary } = await withTenant(session.activeTenant.id, async (ctx) => ({
    recs: await listRecommendations(ctx),
    summary: await savingsSummary(ctx),
  }));

  const currency = (summary.currency ?? "EUR") as "EUR" | "USD";
  const verifyingRecs = recs.filter((r) => r.state === "verifying");
  const verifyingMinor = verifyingRecs.reduce((s, r) => s + (r.impactMinor ?? 0), 0);

  // Closure rate = confirmed / (confirmed + not_observed). Ignores states
  // still in flight. If nobody's finished a cycle yet, we say so.
  const confirmedCount = recs.filter((r) => r.state === "confirmed").length;
  const closedTotal = confirmedCount + summary.notObservedCount;
  const closureRate = closedTotal > 0 ? (confirmedCount / closedTotal) * 100 : null;

  return (
    <AppShell active="savings" session={session}>
      <PageHeader
        title="Savings"
        description="A recommendation is a suggestion. A saving is a fact with a date."
        actions={<SweepButton />}
      />

      <KpiGrid>
        <Kpi
          tone="recovered"
          label="Confirmed, lifetime"
          value={`€${(summary.lifetimeMinor / 100).toLocaleString("en-IE", { maximumFractionDigits: 0 })}`}
          hint="Verified against billed cost"
        />
        <Kpi
          tone="estimated"
          label="In verification"
          value={<Money amount={verifyingMinor} basis="estimated" currency={currency} />}
          hint={`${summary.verifyingCount} recommendation${summary.verifyingCount === 1 ? "" : "s"} · 28-day window`}
        />
        <Kpi
          tone="overrun"
          label="Not observed"
          value={String(summary.notObservedCount)}
          hint="Applied, but no measurable fall"
        />
        <Kpi
          label="Closure rate"
          value={closureRate !== null ? `${closureRate.toFixed(0)}%` : "—"}
          hint={
            closureRate !== null
              ? `${confirmedCount} confirmed / ${closedTotal} closed`
              : "No verifications closed yet"
          }
          tone={closureRate === null ? "default" : closureRate >= 70 ? "recovered" : closureRate >= 40 ? "threshold" : "overrun"}
        />
      </KpiGrid>

      {recs.length === 0 ? (
        <Card>
          <CardBody className="text-muted">
            No recommendations yet. Run an ingestion from the Connection page — findings will land here.
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {recs.map((r) => (
            <RecommendationCard key={r.id} rec={r} currency={currency} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function RecommendationCard({
  rec,
  currency,
}: {
  rec: Awaited<ReturnType<typeof listRecommendations>>[number];
  currency: "EUR" | "USD";
}) {
  const heading =
    rec.state === "confirmed" ? "Confirmed" : rec.rule === "cost_break" ? "Change" : "Impact";
  const tone: "up" | "down" | "neutral" =
    rec.state === "confirmed" ? "down" : rec.rule === "cost_break" ? "up" : "neutral";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-baseline gap-2.5">
          <span className="font-mono text-[13px] text-muted">{rec.id.slice(0, 8)}</span>
          <CardTitle>{humanRule(rec.rule)}</CardTitle>
          <CardHint>{rec.entityName ?? "workspace"}</CardHint>
        </div>
        <div className="flex items-center gap-2">
          <StatePill state={rec.state} />
          {rec.impactBasis ? <BasisPill basis={rec.impactBasis} /> : null}
          <TransitionButton id={rec.id} state={rec.state} />
        </div>
      </CardHeader>
      <CardBody>
        <div className="flex flex-wrap justify-between gap-6">
          <p className="text-muted max-w-[66ch] m-0">{rec.explanation}</p>
          <div className="text-right">
            <div className="font-mono text-[11px] uppercase tracking-[.12em] text-muted">{heading}</div>
            <div className="text-[22px] mt-1">
              <Money
                amount={rec.impactMinor}
                basis={rec.impactBasis ?? "billed"}
                tone={tone}
                currency={currency}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 pt-3.5 border-t border-rule font-mono text-[11px] uppercase tracking-[.06em] text-muted flex flex-wrap gap-3">
          <Chain state={rec.state} />
          <span className="ml-auto text-muted normal-case tracking-normal">
            opened {new Date(rec.openedAt).toISOString().slice(0, 10)}
            {rec.appliedAt ? ` · applied ${new Date(rec.appliedAt).toISOString().slice(0, 10)}` : ""}
          </span>
        </div>
      </CardBody>
    </Card>
  );
}

function Chain({ state }: { state: RecommendationState }) {
  if (state === "not_observed") {
    const done = ["open", "accepted", "applied", "verifying"];
    return (
      <span className="inline-flex flex-wrap gap-2">
        {done.map((s) => (
          <span key={s} className="text-ink">{s}</span>
        ))}
        <span className="text-overrun border-b border-current">not observed</span>
      </span>
    );
  }
  const i = SEQUENCE.indexOf(state);
  return (
    <span className="inline-flex flex-wrap gap-2">
      {SEQUENCE.map((s, j) => (
        <span
          key={s}
          className={j <= i ? "text-ink" : "text-muted"}
          style={j === i ? { borderBottom: "1px solid currentColor" } : undefined}
        >
          {s}
        </span>
      ))}
    </span>
  );
}

function humanRule(id: string): string {
  switch (id) {
    case "jobs_on_all_purpose": return "Jobs on all-purpose compute";
    case "no_autotermination":  return "No or long autotermination";
    case "idle_warehouse":      return "Idle SQL warehouse";
    case "instance_mismatch":   return "Instance-type mismatch";
    case "cost_break":          return "Cost break";
    case "unattributed":        return "Unattributed spend";
    case "right_sizing":        return "Autoscale cap set too high";
    case "dbr_upgrade":         return "Runtime version needs upgrading";
    case "spot_candidate":      return "Job could run on spot instances";
    default:                    return id;
  }
}
