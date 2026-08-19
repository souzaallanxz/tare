import type { Basis, IsoDate } from "@tare/core";
import { addDays, weekdayIndex } from "@tare/core";

export type ForecastPoint = {
  date: IsoDate;
  costMinor: number;
  basis: Basis;
};

/**
 * Same-weekday, trailing 4-week mean. Always estimated.
 * A confidence interval on top of a naive method would be theatre.
 */
export function forecastMonth(
  history: readonly { date: IsoDate; costMinor: number }[],
  from: IsoDate,
  days: number,
): ForecastPoint[] {
  const byWeekday = new Map<number, number[]>();
  for (const p of history) {
    const w = weekdayIndex(p.date);
    if (!byWeekday.has(w)) byWeekday.set(w, []);
    byWeekday.get(w)!.push(p.costMinor);
  }
  const means = new Map<number, number>();
  for (const [w, xs] of byWeekday) {
    const last = xs.slice(-4);
    means.set(w, last.reduce((s, v) => s + v, 0) / last.length);
  }

  const out: ForecastPoint[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const mean = means.get(weekdayIndex(date)) ?? 0;
    out.push({ date, costMinor: Math.round(mean), basis: "estimated" });
  }
  return out;
}
