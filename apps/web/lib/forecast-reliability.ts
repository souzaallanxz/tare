import { mad, median } from "@tare/rules";

export type ForecastReliability = {
  level: "high" | "medium" | "low";
  weeksOfHistory: number;
  volatility: number;                    // MAD / median, dimensionless
  reasons: string[];
};

/**
 * Qualitative reliability tag for the run-rate forecast. Never a confidence
 * interval — the spec forbids one on a naive method. Reports what actually
 * informed the number: how many weeks of history and how noisy those
 * weekdays are.
 */
export function forecastReliability(dailyMinor: readonly number[]): ForecastReliability {
  const clean = dailyMinor.filter((v) => v > 0);
  const weeksOfHistory = Math.floor(clean.length / 7);

  const m = median(clean);
  const s = mad(clean);
  const volatility = m > 0 ? s / m : 0;

  const reasons: string[] = [];
  reasons.push(`${weeksOfHistory} week${weeksOfHistory === 1 ? "" : "s"} of history`);
  if (volatility >= 0.4) reasons.push(`daily costs vary by ±${(volatility * 100).toFixed(0)}%`);
  else if (volatility >= 0.2) reasons.push(`moderate daily variance`);
  else reasons.push(`stable daily costs`);

  let level: ForecastReliability["level"];
  if (weeksOfHistory >= 4 && volatility < 0.25) level = "high";
  else if (weeksOfHistory >= 2 && volatility < 0.5) level = "medium";
  else level = "low";

  return { level, weeksOfHistory, volatility, reasons };
}
