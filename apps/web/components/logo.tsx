/**
 * The mark is the product's signature UI element reduced to three parts:
 * measured, estimated, limit. Users recognise the logo inside the screen.
 * See the identity spec — never rotated, never gradient, gap never closes.
 */
export function Mark({
  size = 24,
  variant = "colour",
}: {
  size?: number;
  variant?: "colour" | "dark" | "mono";
}) {
  const ink = variant === "dark" ? "#FFFFFF" : "#101A2B";
  const est =
    variant === "dark" ? "#9E93C4" : variant === "mono" ? "rgba(16,26,43,.38)" : "#7A6CA8";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      <rect x="1" y="10" width="10" height="4" rx="1" fill={ink} />
      <rect x="12.5" y="10" width="5.5" height="4" rx="1" fill={est} />
      <rect x="20" y="4" width="2.2" height="16" rx="1.1" fill={ink} />
    </svg>
  );
}

export function Lockup({
  size = 22,
  variant = "colour",
}: {
  size?: number;
  variant?: "colour" | "dark" | "mono";
}) {
  const colour = variant === "dark" ? "#FFFFFF" : "#101A2B";
  return (
    <span className="inline-flex items-center gap-[9px]">
      <Mark size={size} variant={variant} />
      <span
        style={{
          fontWeight: 500,
          letterSpacing: "-0.035em",
          fontSize: Math.round(size * 0.82),
          color: colour,
        }}
      >
        tare
      </span>
    </span>
  );
}
