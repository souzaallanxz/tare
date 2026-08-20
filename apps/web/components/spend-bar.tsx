import type { Currency } from "@tare/core";
import { Money } from "./money";
import { cn } from "../lib/cn";

type Props = {
  billedMinor: number;
  forecastMinor: number;
  budgetMinor: number;
  currency?: Currency;
  className?: string;
};

/**
 * The signature bar: measured | gap | estimated, with a limit marker.
 * Kept as bespoke DOM rather than a chart library — this is the brand mark
 * expressed as UI. Its geometry has to match the logo exactly.
 */
export function SpendBar({
  billedMinor,
  forecastMinor,
  budgetMinor,
  currency = "EUR",
  className,
}: Props) {
  const remaining = Math.max(0, forecastMinor - billedMinor);
  const scale = Math.max(forecastMinor, budgetMinor) * 1.07;
  const pct = (n: number) => `${(n / scale) * 100}%`;

  return (
    <div className={cn("w-full", className)}>
      <div className="relative flex h-4 bg-ink/[.07] mt-1.5 mb-3.5">
        <div className="bg-ink rounded-[1px]" style={{ width: pct(billedMinor) }} />
        <div className="w-1.5" />
        <div
          className="rounded-[1px] bg-estimated"
          style={{
            width: pct(remaining),
            backgroundImage:
              "repeating-linear-gradient(135deg,rgba(255,255,255,0) 0 3px,rgba(255,255,255,.55) 3px 5px)",
          }}
        />
        <div
          className="absolute -top-1 -bottom-1 w-[2.2px] bg-ink rounded-[1.1px]"
          style={{ left: pct(budgetMinor) }}
        />
      </div>

      <div className="flex flex-wrap items-baseline gap-5 text-[13px]">
        <span className="flex flex-col gap-[3px]">
          <span className="font-mono text-[11px] uppercase tracking-[.12em] text-muted">Billed</span>
          <Money amount={billedMinor} basis="billed" currency={currency} />
        </span>
        <span className="flex flex-col gap-[3px]">
          <span className="font-mono text-[11px] uppercase tracking-[.12em] text-estimated">
            Forecast, remaining
          </span>
          <Money amount={remaining} basis="estimated" currency={currency} />
        </span>
        <span className="flex flex-col gap-[3px]">
          <span className="font-mono text-[11px] uppercase tracking-[.12em] text-muted">Budget</span>
          <span className="font-mono font-medium tabular-nums tracking-[-0.03em] whitespace-nowrap">
            €{(budgetMinor / 100).toLocaleString("en-IE", { maximumFractionDigits: 0 })}
          </span>
        </span>
      </div>
    </div>
  );
}
