/** ISO date in UTC, YYYY-MM-DD. Databricks system.billing.usage reports usage_date in UTC. */
export type IsoDate = string;

export function toIsoDate(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

export function parseIsoDate(s: IsoDate): Date {
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid ISO date: ${s}`);
  return d;
}

export function addDays(s: IsoDate, days: number): IsoDate {
  const d = parseIsoDate(s);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

export function eachDay(start: IsoDate, end: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

export function weekdayIndex(s: IsoDate): number {
  return parseIsoDate(s).getUTCDay();
}
