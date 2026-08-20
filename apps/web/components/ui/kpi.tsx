import * as React from "react";
import { cn } from "../../lib/cn";

type Tone = "default" | "estimated" | "recovered" | "overrun" | "threshold";

const TONE: Record<Tone, string> = {
  default:   "text-ink",
  estimated: "text-estimated border-b border-dotted border-estimated pb-0.5",
  recovered: "text-recovered",
  overrun:   "text-overrun",
  threshold: "text-threshold",
};

export function KpiGrid({
  cols = 4,
  children,
  className,
}: {
  cols?: 3 | 4;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-px bg-rule border border-rule mb-6",
        cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="bg-surface p-[18px]">
      <div className="font-mono text-[11px] uppercase tracking-[.12em] text-muted">{label}</div>
      <div
        className={cn(
          "font-mono font-medium text-[26px] leading-tight tabular-nums tracking-[-0.03em] my-2 inline-block",
          TONE[tone],
        )}
      >
        {value}
      </div>
      {hint ? <div className="text-[12.5px] text-muted">{hint}</div> : null}
    </div>
  );
}
