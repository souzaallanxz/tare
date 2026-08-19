export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Median Absolute Deviation, scaled to be a consistent estimator of σ for normal data. */
export function mad(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const m = median(values);
  const deviations = values.map((v) => Math.abs(v - m));
  return 1.4826 * median(deviations);
}
