"use client";

import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { OwnerTrendPoint } from "../lib/owner-trend";

// Ink first (largest owner usually), then rotate through the semantic palette
// tuned to stay legible on the paper background. Overrun/Recovered are
// reserved for meaning elsewhere, so trend fills use ink shades.
const PALETTE = [
  "#101A2B",
  "#5A6675",
  "#7A6CA8",   // estimated — used here only for owner distinction, not to signal basis
  "#C08A2E",
  "#1F6F5C",
  "#A63A2A",
];

type Props = {
  days: OwnerTrendPoint[];
  ownerNames: string[];
  currency?: "EUR" | "USD";
  height?: number;
};

export function OwnerTrendChart({ days, ownerNames, currency = "EUR", height = 240 }: Props) {
  if (days.length === 0) {
    return <div className="px-4 py-4 text-muted text-sm">No usage in the trailing window.</div>;
  }
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={days} margin={{ top: 8, right: 12, left: 8, bottom: 0 }} barCategoryGap={2}>
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => d.slice(5)}    // MM-DD
            tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#5A6675" }}
            tickLine={false}
            axisLine={{ stroke: "#D7DDE5" }}
            interval={Math.max(0, Math.floor(days.length / 8))}
          />
          <YAxis
            tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#5A6675" }}
            tickLine={false}
            axisLine={{ stroke: "#D7DDE5" }}
            width={44}
            tickFormatter={(v: number) => `€${Math.round(v)}`}
          />
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
            labelFormatter={(label: string) => label}
            formatter={(v: number, n: string) => [
              new Intl.NumberFormat("en-IE", {
                style: "currency",
                currency,
                maximumFractionDigits: 0,
              }).format(v),
              n,
            ]}
          />
          <Legend
            wrapperStyle={{ fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em" }}
            iconType="square"
          />
          {ownerNames.map((name, i) => (
            <Bar key={name} dataKey={name} stackId="a" fill={PALETTE[i % PALETTE.length]} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
