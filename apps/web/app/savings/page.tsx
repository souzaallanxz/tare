import { withTenant } from "@tare/db";
import { listRecommendations, savingsSummary } from "@tare/db/repositories";
import { AppShell } from "../../components/shell";
import { Money } from "../../components/money";
import { BasisPill, StatePill } from "../../components/pills";
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

  return (
    <AppShell active="savings" session={session}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 className="display">Savings</h1>
          <p className="mut" style={{ margin: "6px 0 0" }}>
            A recommendation is a suggestion. A saving is a fact with a date.
          </p>
        </div>
        <SweepButton />
      </div>

      <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="kpi">
          <span className="label">Confirmed, lifetime</span>
          <div className="v rec">
            €{(summary.lifetimeMinor / 100).toLocaleString("en-IE", { maximumFractionDigits: 0 })}
          </div>
          <span className="n">Verified against billed cost</span>
        </div>
        <div className="kpi">
          <span className="label">In verification</span>
          <div className="v est"><Money amount={verifyingMinor} basis="estimated" currency={currency} /></div>
          <span className="n">
            {summary.verifyingCount} recommendation{summary.verifyingCount === 1 ? "" : "s"} · 28-day window
          </span>
        </div>
        <div className="kpi">
          <span className="label">Not observed</span>
          <div className="v ovr">{summary.notObservedCount}</div>
          <span className="n">Applied, but no measurable fall</span>
        </div>
      </div>

      {recs.length === 0 ? (
        <section className="panel">
          <div className="pad mut">
            No recommendations yet. Run an ingestion from the Connection page — findings will land here.
          </div>
        </section>
      ) : (
        recs.map((r) => (
          <RecommendationCard key={r.id} rec={r} currency={currency} />
        ))
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
    <section className="panel">
      <header>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span className="data mut">{rec.id.slice(0, 8)}</span>
          <span className="title">{humanRule(rec.rule)}</span>
          <span className="label">{rec.entityName ?? "workspace"}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <StatePill state={rec.state} />
          {rec.impactBasis ? <BasisPill basis={rec.impactBasis} /> : null}
          <TransitionButton id={rec.id} state={rec.state} />
        </div>
      </header>
      <div className="pad">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 26, flexWrap: "wrap" }}>
          <p className="mut" style={{ maxWidth: "66ch", margin: 0 }}>{rec.explanation}</p>
          <div style={{ textAlign: "right" }}>
            <div className="label">{heading}</div>
            <div style={{ fontSize: 22, marginTop: 4 }}>
              <Money amount={rec.impactMinor} basis={rec.impactBasis ?? "billed"} tone={tone} currency={currency} />
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid var(--color-rule)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            color: "var(--color-muted)",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Chain state={rec.state} />
          <span className="mut" style={{ marginLeft: "auto", textTransform: "none", letterSpacing: 0 }}>
            opened {new Date(rec.openedAt).toISOString().slice(0, 10)}
            {rec.appliedAt ? ` · applied ${new Date(rec.appliedAt).toISOString().slice(0, 10)}` : ""}
          </span>
        </div>
      </div>
    </section>
  );
}

function Chain({ state }: { state: RecommendationState }) {
  if (state === "not_observed") {
    const done = ["open", "accepted", "applied", "verifying"];
    return (
      <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
        {done.map((s) => (
          <span key={s} style={{ color: "var(--color-ink)" }}>{s}</span>
        ))}
        <span style={{ color: "var(--color-overrun)", borderBottom: "1px solid currentColor" }}>not observed</span>
      </span>
    );
  }
  const i = SEQUENCE.indexOf(state);
  return (
    <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
      {SEQUENCE.map((s, j) => (
        <span
          key={s}
          style={{
            color: j <= i ? "var(--color-ink)" : "var(--color-muted)",
            borderBottom: j === i ? "1px solid currentColor" : undefined,
          }}
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
    default:                    return id;
  }
}
