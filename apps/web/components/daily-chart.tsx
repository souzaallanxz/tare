import { FIXTURE } from "../lib/fixtures";

/** Solid bars up to the billed cut, 135° hatch after — same treatment as the spend bar. */
export function DailyChart({ height = 148 }: { height?: number }) {
  const w = 680;
  const pad = 16;
  const days = FIXTURE.dailyMinor;
  const max = Math.max(...days);
  const bw = (w - pad * 2) / days.length;

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      width="100%"
      role="img"
      aria-label="Daily spend, August 2026, forecast after the 23rd"
    >
      <defs>
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(135)">
          <rect width="6" height="6" fill="#7A6CA8" />
          <rect width="2" height="6" fill="#fff" opacity=".55" />
        </pattern>
      </defs>
      <line x1={pad} y1={height - 26} x2={w - pad} y2={height - 26} stroke="#D7DDE5" />
      {days.map((v, i) => {
        const bh = Math.max(2, (v / max) * (height - 44));
        const x = pad + i * bw;
        const y = height - 26 - bh;
        const billed = i < FIXTURE.billedDays;
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
                {i + 1} Aug · €{(v / 100).toLocaleString("en-IE", { minimumFractionDigits: 2 })} ·{" "}
                {billed ? "billed" : "estimated"}
              </title>
            </rect>
            {(i % 7 === 0 || i === days.length - 1) && (
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
