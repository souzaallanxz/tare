type Props = {
  dailyMinor: readonly number[];
  billedDays: number;
  height?: number;
};

/** Solid bars up to billedDays, 135° hatched after — matches the spend bar. */
export function DailyChart({ dailyMinor, billedDays, height = 148 }: Props) {
  const w = 680;
  const pad = 16;
  const max = Math.max(...dailyMinor, 1);
  const bw = (w - pad * 2) / dailyMinor.length;

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      width="100%"
      role="img"
      aria-label="Daily spend; forecast bars are hatched"
    >
      <defs>
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(135)">
          <rect width="6" height="6" fill="#7A6CA8" />
          <rect width="2" height="6" fill="#fff" opacity=".55" />
        </pattern>
      </defs>
      <line x1={pad} y1={height - 26} x2={w - pad} y2={height - 26} stroke="#D7DDE5" />
      {dailyMinor.map((v, i) => {
        const bh = Math.max(2, (v / max) * (height - 44));
        const x = pad + i * bw;
        const y = height - 26 - bh;
        const billed = i < billedDays;
        return (
          <g key={i}>
            <rect
              x={x + 1}
              y={y}
              width={bw - 2}
              height={bh}
              rx={1}
              fill={billed ? "#101A2B" : "url(#hatch)"}
              stroke={billed ? undefined : "#7A6CA8"}
              strokeWidth={billed ? undefined : 0.5}
            >
              <title>
                {i + 1} · €{(v / 100).toLocaleString("en-IE", { minimumFractionDigits: 2 })} ·{" "}
                {billed ? "billed" : "estimated"}
              </title>
            </rect>
            {(i % 7 === 0 || i === dailyMinor.length - 1) && (
              <text
                x={x + bw / 2}
                y={height - 9}
                fontFamily="var(--font-mono)"
                fontSize={10}
                fill="#5A6675"
                textAnchor="middle"
              >
                {i + 1}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
