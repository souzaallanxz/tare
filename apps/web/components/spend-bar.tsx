import { Money } from "./money";

export function SpendBar({
  billedMinor,
  forecastMinor,
  budgetMinor,
  currency = "EUR",
}: {
  billedMinor: number;
  forecastMinor: number;
  budgetMinor: number;
  currency?: "EUR" | "USD";
}) {
  const remaining = Math.max(0, forecastMinor - billedMinor);
  const scale = Math.max(forecastMinor, budgetMinor) * 1.07;
  const pct = (n: number) => `${(n / scale) * 100}%`;
  return (
    <div>
      <div className="spend-bar" style={{ margin: "6px 0 14px" }}>
        <div className="measured" style={{ width: pct(billedMinor) }} />
        <div className="gap" />
        <div className="estimated" style={{ width: pct(remaining) }} />
        <div className="limit" style={{ left: pct(budgetMinor) }} />
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "baseline", fontSize: 13 }}>
        <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span className="label">Billed</span>
          <Money amount={billedMinor} basis="billed" currency={currency} />
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span className="label" style={{ color: "var(--color-estimated)" }}>
            Forecast, remaining
          </span>
          <Money amount={remaining} basis="estimated" currency={currency} />
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span className="label">Budget</span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.03em",
            }}
          >
            €{(budgetMinor / 100).toLocaleString("en-IE", { maximumFractionDigits: 0 })}
          </span>
        </span>
      </div>
    </div>
  );
}
