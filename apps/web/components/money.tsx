import type { Basis, Currency } from "@tare/core";
import { formatMinor } from "@tare/core";

type Tone = "neutral" | "up" | "down";

type Props = {
  amount: number | null;              // minor units
  currency?: Currency;
  basis: Basis;                        // NEVER omit — this is the contract
  tone?: Tone;                         // meaningful only for billed values
  className?: string;
};

/**
 * The single point where a monetary value reaches the DOM.
 *
 * Rules enforced by the type signature:
 *   - basis is required. There is no default. billed and estimated numbers
 *     are visually distinct and never mixed.
 *   - amount is minor units (integer cents). Rendering formats to major units.
 *
 * Estimated values carry the violet colour AND a dotted underline AND the tooltip.
 * Removing any one of those without replacing it is a change to the trust
 * contract, not a styling tweak.
 */
export function Money({ amount, currency = "EUR", basis, tone = "neutral", className }: Props) {
  if (amount === null) {
    return <span className={cx("m mut", className)} data-basis="none">—</span>;
  }

  const classes = ["m"];
  if (basis === "estimated") {
    classes.push("est");
  } else if (tone === "up") {
    classes.push("ovr");
  } else if (tone === "down") {
    classes.push("rec");
  }
  if (className) classes.push(className);

  const title =
    basis === "estimated"
      ? "Estimated — derived, projected, or priced at list"
      : "Billed — recorded by Databricks, priced at a rate we hold";

  const style: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.03em",
    whiteSpace: "nowrap",
    color:
      basis === "estimated"
        ? "var(--color-estimated)"
        : tone === "up"
        ? "var(--color-overrun)"
        : tone === "down"
        ? "var(--color-recovered)"
        : "var(--color-ink)",
    borderBottom: basis === "estimated" ? "1px dotted var(--color-estimated)" : undefined,
    paddingBottom: basis === "estimated" ? 1 : undefined,
  };

  return (
    <span title={title} style={style} data-basis={basis}>
      {formatMinor(amount, currency)}
    </span>
  );
}

function cx(...parts: (string | undefined | false)[]): string {
  return parts.filter(Boolean).join(" ");
}
