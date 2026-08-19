import type { Basis } from "@tare/core";
import type { RecommendationState } from "@tare/core";

type Variant = "ink" | "muted" | "est" | "rec" | "ovr" | "thr";

const COLOUR: Record<Variant, { border: string; color: string }> = {
  ink: { border: "rgba(16,26,43,.4)", color: "var(--color-ink)" },
  muted: { border: "var(--color-rule)", color: "var(--color-muted)" },
  est: { border: "var(--color-estimated)", color: "var(--color-estimated)" },
  rec: { border: "var(--color-recovered)", color: "var(--color-recovered)" },
  ovr: { border: "var(--color-overrun)", color: "var(--color-overrun)" },
  thr: { border: "var(--color-threshold)", color: "var(--color-threshold)" },
};

export function Pill({
  variant = "muted",
  children,
  dot = false,
}: {
  variant?: Variant;
  children: React.ReactNode;
  dot?: boolean;
}) {
  const c = COLOUR[variant];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        padding: "3px 8px",
        border: `1px solid ${c.border}`,
        color: c.color,
        background: "var(--color-surface)",
        whiteSpace: "nowrap",
      }}
    >
      {dot ? (
        <span
          style={{ width: 6, height: 6, background: "currentColor", display: "inline-block" }}
        />
      ) : null}
      {children}
    </span>
  );
}

export function BasisPill({ basis }: { basis: Basis }) {
  return basis === "estimated" ? (
    <Pill variant="est">estimated</Pill>
  ) : (
    <Pill variant="ink">billed</Pill>
  );
}

const STATE_VARIANT: Record<RecommendationState, Variant> = {
  open: "muted",
  accepted: "muted",
  applied: "muted",
  verifying: "thr",
  confirmed: "rec",
  not_observed: "ovr",
};

export function StatePill({ state }: { state: RecommendationState }) {
  return (
    <Pill variant={STATE_VARIANT[state]} dot>
      {state === "not_observed" ? "not observed" : state}
    </Pill>
  );
}
