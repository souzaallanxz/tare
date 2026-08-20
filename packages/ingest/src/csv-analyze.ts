/**
 * Analyzes a CSV export of Databricks `system.billing.usage` (or any
 * comparable file) and returns a validation summary. Nothing is written
 * to the database from here — the caller decides after showing the
 * summary to the user.
 *
 * The five required columns are the ones csvSource() reads. Others are
 * carried through untouched. Column names use small mapping helpers so a
 * customer whose export slightly renames a field can still line it up
 * without re-exporting.
 */

const REQUIRED = ["usage_date", "sku_name", "usage_quantity", "list_price", "entity_id"] as const;
type Required = (typeof REQUIRED)[number];

const ALIASES: Record<Required, readonly string[]> = {
  usage_date:     ["usage_date", "date"],
  sku_name:       ["sku_name", "sku"],
  usage_quantity: ["usage_quantity", "quantity", "dbus"],
  list_price:     ["list_price", "list_rate", "price"],
  entity_id:      ["entity_id", "cluster_id", "warehouse_id", "job_id", "pipeline_id"],
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type CsvAnalysis = {
  totalRows: number;
  validRows: number;
  rejectedRows: number;
  rejectReasons: Record<string, number>;
  header: readonly string[];
  columnMap: Readonly<Record<Required, string>>;
  missing: readonly Required[];
  dateRange: { start: string; end: string } | null;
  distinctEntities: number;
  distinctSkus: number;
  sampleValid: readonly Record<string, string>[];  // first 5 clean rows
};

export function analyzeCsv(text: string): CsvAnalysis {
  const rows = parseCsv(text);
  const header = rows[0] ?? [];
  const body = rows.slice(1);

  const columnMap: Partial<Record<Required, string>> = {};
  for (const name of REQUIRED) {
    const alias = ALIASES[name].find((a) => header.includes(a));
    if (alias) columnMap[name] = alias;
  }
  const missing = REQUIRED.filter((n) => columnMap[n] === undefined);

  const rejectReasons: Record<string, number> = {};
  let validRows = 0;
  let start = "9999-12-31";
  let end = "0000-01-01";
  const entities = new Set<string>();
  const skus = new Set<string>();
  const sample: Record<string, string>[] = [];

  if (missing.length === 0) {
    const idx: Record<Required, number> = REQUIRED.reduce((acc, name) => {
      acc[name] = header.indexOf(columnMap[name]!);
      return acc;
    }, {} as Record<Required, number>);

    for (const r of body) {
      if (r.length === 1 && r[0] === "") continue; // trailing blank
      const reason = classifyRow(r, idx);
      if (reason) {
        rejectReasons[reason] = (rejectReasons[reason] ?? 0) + 1;
        continue;
      }
      const date = r[idx.usage_date]!;
      if (date < start) start = date;
      if (date > end) end = date;
      entities.add(r[idx.entity_id]!);
      skus.add(r[idx.sku_name]!);
      validRows++;
      if (sample.length < 5) {
        const obj: Record<string, string> = {};
        header.forEach((h, i) => { obj[h] = r[i] ?? ""; });
        sample.push(obj);
      }
    }
  } else {
    for (const r of body) if (r.length > 1 || r[0] !== "") rejectReasons["header:missing columns"] = (rejectReasons["header:missing columns"] ?? 0) + 1;
  }

  return {
    totalRows: body.length,
    validRows,
    rejectedRows: body.length - validRows,
    rejectReasons,
    header,
    columnMap: columnMap as Record<Required, string>,
    missing,
    dateRange: validRows > 0 ? { start, end } : null,
    distinctEntities: entities.size,
    distinctSkus: skus.size,
    sampleValid: sample,
  };
}

function classifyRow(row: readonly string[], idx: Record<Required, number>): string | null {
  const date = row[idx.usage_date] ?? "";
  if (!ISO_DATE.test(date)) return `usage_date not YYYY-MM-DD`;
  const qty = Number(row[idx.usage_quantity]);
  if (!Number.isFinite(qty) || qty < 0) return `usage_quantity not a positive number`;
  const price = Number(row[idx.list_price]);
  if (!Number.isFinite(price) || price < 0) return `list_price not a positive number`;
  if (!row[idx.entity_id]) return `entity_id missing`;
  if (!row[idx.sku_name]) return `sku_name missing`;
  return null;
}

// Same lightweight parser as csv.ts — kept independent so this module does not
// depend on the source runner.
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); out.push(row); row = []; field = ""; }
    else if (c === "\r") { /* ignore */ }
    else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); out.push(row); }
  return out;
}
