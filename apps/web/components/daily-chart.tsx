"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Props = {
  dailyMinor: readonly number[];
  billedDays: number;
  height?: number;
  currency?: "EUR" | "USD";
};

const INK = "#101A2B";
const ESTIMATED = "#7A6CA8";

/**
 * Recharts bar chart. Same semantic split as before: bars up to `billedDays`
 * paint solid ink (billed), bars after paint violet (estimated). The estimated
 * treatment is colour-encoded — the hatched fill from the SVG version drops
 * because Recharts doesn't cleanly support pattern fills per-bar. Colour +
 * word in the tooltip carry the invariant.
 */
export function DailyChart({ dailyMinor, billedDays, height = 160, currency = "EUR" }: Props) {
  const data = dailyMinor.map((v, i) => ({
    day: i + 1,
    cost: v / 100,
    billed: i < billedDays,
  }));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 6, right: 6, left: 6, bottom: 0 }} barCategoryGap={2}>
          <XAxis
            dataKey="day"
            tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#5A6675" }}
            tickLine={false}
            axisLine={{ stroke: "#D7DDE5" }}
            interval={6}
          />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: "rgba(16,26,43,.05)" }}
            contentStyle={{
              background: "#FFFFFF",
              border: "1px solid #D7DDE5",
              borderRadius: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              padding: "6px 10px",
            }}
            formatter={(value: number, _n, p) => {
              const basis = (p.payload as { billed: boolean }).billed ? "billed" : "estimated";
              return [
                `${new Intl.NumberFormat("en-IE", { style: "currency", currency, maximumFractionDigits: 2 }).format(value)} · ${basis}`,
                "",
              ];
            }}
            labelFormatter={(label) => `Day ${label}`}
            separator=""
          />
          <Bar dataKey="cost" radius={[1, 1, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.billed ? INK : ESTIMATED} fillOpacity={d.billed ? 1 : 0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
