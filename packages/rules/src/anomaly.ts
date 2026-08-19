import type { IsoDate } from "@tare/core";
import { mad, median } from "./stats.ts";

export type AnomalyPoint = {
  date: IsoDate;
  observedMinor: number;
  baselineMedianMinor: number;
  direction: "up" | "down";
  score: number;
};

/**
 * Rolling 28-day median + k*MAD, both directions. A dip matters as much
 * as a spike — a job that stops running is either a saving or a broken job.
 */
export function detectAnomalies(
  series: readonly { date: IsoDate; costMinor: number }[],
  opts: { window?: number; k?: number } = {},
): AnomalyPoint[] {
  const window = opts.window ?? 28;
  const k = opts.k ?? 3;
  if (series.length <= window) return [];

  const sorted = [...series].sort((a, b) => (a.date < b.date ? -1 : 1));
  const out: AnomalyPoint[] = [];

  for (let i = window; i < sorted.length; i++) {
    const baseline = sorted.slice(i - window, i).map((p) => p.costMinor);
    const m = median(baseline);
    const scale = mad(baseline);
    if (scale === 0) continue;
    const point = sorted[i]!;
    const score = (point.costMinor - m) / scale;
    if (Math.abs(score) < k) continue;
    out.push({
      date: point.date,
      observedMinor: point.costMinor,
      baselineMedianMinor: Math.round(m),
      direction: score > 0 ? "up" : "down",
      score: Number(score.toFixed(2)),
    });
  }
  return out;
}
