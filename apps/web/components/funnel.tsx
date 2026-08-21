import type { FunnelStage } from "@tare/db/repositories";

/**
 * Horizontal funnel that reads left-to-right: open → accepted → applied →
 * verifying → (confirmed | not_observed). Widths scale to the max stage so
 * relative drop-off is visible at a glance.
 *
 * confirmed = green (invoice-verified) · not_observed = red · pending = ink.
 * No fancy SVG — plain flex divs.
 */
export function Funnel({ stages }: { stages: readonly FunnelStage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.count));

  return (
    <div className="grid gap-1.5">
      {stages.map((s) => {
        const width = (s.count / max) * 100;
        const cls =
          s.state === "confirmed"
            ? "bg-recovered text-white"
            : s.state === "not_observed"
              ? "bg-overrun text-white"
              : "bg-ink text-white";
        return (
          <div key={s.state} className="grid grid-cols-[130px_1fr_60px] items-center gap-3 text-[13px]">
            <span className="font-mono text-[11px] uppercase tracking-[.08em] text-muted">
              {label(s.state)}
            </span>
            <div className="h-6 relative bg-rule/60">
              <div
                className={`h-full ${cls} flex items-center px-2 font-mono text-[11px]`}
                style={{ width: `${Math.max(width, s.count > 0 ? 4 : 0)}%` }}
              >
                {s.count > 0 ? s.count : ""}
              </div>
            </div>
            <span className="font-mono tabular-nums text-right text-muted">{s.count}</span>
          </div>
        );
      })}
    </div>
  );
}

function label(s: string): string {
  return s === "not_observed" ? "not observed" : s;
}
