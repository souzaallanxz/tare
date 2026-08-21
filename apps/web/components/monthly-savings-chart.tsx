"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlySaving } from "@tare/db/repositories";

const RECOVERED = "#1F6F5C";
const RULE = "#D7DDE5";
const MUTED = "#5A6675";

/**
 * Twelve-month run-rate. Bars are billed savings — the confirmation column
 * of the saving state machine. Bars use `recovered` colour by the spec:
 * green means invoice-verified, nothing else.
 */
export function MonthlySavingsChart({
  data,
  currency = "EUR",
  height = 200,
}: {
  data: MonthlySaving[];
  currency?: "EUR" | "USD";
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div className="px-4 py-4 text-muted text-sm">
        No confirmed savings yet. Verified amounts appear here after the 28-day window closes.
      </div>
    );
  }

  const rows = data.map((r) => ({ month: r.month.slice(5), amount: r.amountMinor / 100 }));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 12, left: 8, bottom: 0 }} barCategoryGap={4}>
          <XAxis
            dataKey="month"
            tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: MUTED }}
            tickLine={false}
            axisLine={{ stroke: RULE }}
          />
          <YAxis
            tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: MUTED }}
            tickLine={false}
            axisLine={{ stroke: RULE }}
            width={54}
            tickFormatter={(v: number) =>
              new Intl.NumberFormat("en-IE", {
                style: "currency",
                currency,
                maximumFractionDigits: 0,
                notation: "compact",
              }).format(v)
            }
          />
          <Tooltip
            cursor={{ fill: "rgba(16,26,43,.05)" }}
            contentStyle={{
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              borderRadius: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              padding: "6px 10px",
            }}
            formatter={(v: number) => [
              new Intl.NumberFormat("en-IE", {
                style: "currency",
                currency,
                maximumFractionDigits: 0,
              }).format(v),
              "confirmed",
            ]}
            separator=""
          />
          <Bar dataKey="amount" radius={[1, 1, 0, 0]} isAnimationActive={false}>
            {rows.map((_, i) => <Cell key={i} fill={RECOVERED} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
