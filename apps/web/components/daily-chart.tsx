"use client";

import {
  Bar,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  dailyMinor: readonly number[];
  billedDays: number;
  height?: number;
  currency?: "EUR" | "USD";
  /** Optional monthly budget (major units) — a horizontal line at the daily equivalent. */
  monthlyBudgetMinor?: number;
};

const INK = "#101A2B";
const ESTIMATED = "#7A6CA8";
const RECOVERED = "#1F6F5C";
const THRESHOLD = "#C08A2E";

/**
 * Bars are cost. Line is the 7-day rolling mean, drawn in green because it
 * is a diagnostic quantity, not a value the user can act on. Optional dashed
 * reference line at the daily budget (monthly limit ÷ days-in-month).
 */
export function DailyChart({
  dailyMinor,
  billedDays,
  height = 180,
  currency = "EUR",
  monthlyBudgetMinor,
}: Props) {
  const data = dailyMinor.map((v, i) => ({
    day: i + 1,
    cost: v / 100,
    billed: i < billedDays,
    ma7: rollingMean(dailyMinor, i, 7) / 100,
  }));

  const dailyBudget =
    monthlyBudgetMinor && monthlyBudgetMinor > 0
      ? monthlyBudgetMinor / 100 / Math.max(dailyMinor.length, 1)
      : null;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 6, right: 6, left: 6, bottom: 0 }} barCategoryGap={2}>
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
            labelFormatter={(label) => `Day ${label}`}
            formatter={(value: number, name: string, p: { payload?: { billed?: boolean } }) => {
              const fmt = new Intl.NumberFormat("en-IE", {
                style: "currency",
                currency,
                maximumFractionDigits: 2,
              }).format(value);
              if (name === "cost") {
                const basis = p.payload?.billed ? "billed" : "estimated";
                return [`${fmt} · ${basis}`, "cost"];
              }
              if (name === "ma7") return [fmt, "7-day mean"];
              return [fmt, name];
            }}
            separator=""
          />
          {dailyBudget !== null && (
            <ReferenceLine
              y={dailyBudget}
              stroke={THRESHOLD}
              strokeDasharray="3 3"
              ifOverflow="extendDomain"
              label={{
                value: "daily budget",
                position: "insideTopRight",
                fill: THRESHOLD,
                fontSize: 10,
                fontFamily: "var(--font-mono)",
              }}
            />
          )}
          <Bar dataKey="cost" radius={[1, 1, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.billed ? INK : ESTIMATED} fillOpacity={d.billed ? 1 : 0.7} />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="ma7"
            stroke={RECOVERED}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function rollingMean(xs: readonly number[], atIndex: number, window: number): number {
  const start = Math.max(0, atIndex - window + 1);
  const slice = xs.slice(start, atIndex + 1);
  if (slice.length === 0) return 0;
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}
