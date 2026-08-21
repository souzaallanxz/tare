import type { CloudInfraRow } from "@tare/db/repositories";

/**
 * Parse a Microsoft Cost Management export CSV (Actual Cost / Amortized
 * exports). Databricks does not publish these — the customer configures a
 * scheduled export in the Azure portal. Columns commonly present in the
 * daily granularity export:
 *
 *   Date, ServiceName, ResourceGroup, ResourceLocation,
 *   MeterCategory, CostInBillingCurrency, BillingCurrency
 *
 * We map to (usage_date, service, resource_group, region, cost_minor,
 * currency). Alias mapping tolerates the export flavours (Amortized vs
 * Actual, older column names like PreTaxCost, InstanceId, etc).
 *
 * Rows without a valid date + positive cost are rejected. Errors accumulate
 * so the caller can surface a validation summary.
 */

const ALIASES = {
  date:      ["Date", "UsageDate", "usage_date"],
  service:   ["ServiceName", "MeterCategory", "service"],
  group:     ["ResourceGroup", "ResourceGroupName", "resource_group"],
  region:    ["ResourceLocation", "Region", "location"],
  cost:      ["CostInBillingCurrency", "Cost", "PreTaxCost", "CostUSD", "cost"],
  currency:  ["BillingCurrency", "BillingCurrencyCode", "Currency", "currency"],
} as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DDMMYYYY = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/;

export type AzureAnalysis = {
  totalRows: number;
  validRows: number;
  rejectedRows: number;
  rejectReasons: Record<string, number>;
  dateRange: { start: string; end: string } | null;
  distinctServices: number;
  totalMinor: number;
  currency: string | null;
  rows: CloudInfraRow[];
};

export function analyzeAzureCsv(text: string): AzureAnalysis {
  const parsed = parseCsv(text);
  const header = parsed[0] ?? [];
  const body = parsed.slice(1);

  const idx = (aliases: readonly string[]): number => {
    for (const a of aliases) {
      const i = header.findIndex((h) => h.trim().toLowerCase() === a.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };
  const dateI = idx(ALIASES.date);
  const serviceI = idx(ALIASES.service);
  const groupI = idx(ALIASES.group);
  const regionI = idx(ALIASES.region);
  const costI = idx(ALIASES.cost);
  const currencyI = idx(ALIASES.currency);

  const missing: string[] = [];
  if (dateI < 0)     missing.push("Date");
  if (serviceI < 0)  missing.push("ServiceName / MeterCategory");
  if (costI < 0)     missing.push("Cost");
  if (currencyI < 0) missing.push("BillingCurrency");

  const rejectReasons: Record<string, number> = {};
  const rows: CloudInfraRow[] = [];
  const services = new Set<string>();
  let start = "9999-12-31";
  let end = "0000-01-01";
  let totalMinor = 0;
  let currency: string | null = null;

  if (missing.length > 0) {
    return {
      totalRows: body.length,
      validRows: 0,
      rejectedRows: body.length,
      rejectReasons: { [`header: missing ${missing.join(", ")}`]: body.length },
      dateRange: null,
      distinctServices: 0,
      totalMinor: 0,
      currency: null,
      rows: [],
    };
  }

  for (const r of body) {
    if (r.length === 1 && r[0] === "") continue;
    const date = normaliseDate(r[dateI] ?? "");
    if (!date) {
      rejectReasons["date not parseable"] = (rejectReasons["date not parseable"] ?? 0) + 1;
      continue;
    }
    const service = (r[serviceI] ?? "").trim();
    if (!service) {
      rejectReasons["service missing"] = (rejectReasons["service missing"] ?? 0) + 1;
      continue;
    }
    const cost = Number(r[costI]);
    if (!Number.isFinite(cost) || cost < 0) {
      rejectReasons["cost not positive"] = (rejectReasons["cost not positive"] ?? 0) + 1;
      continue;
    }
    const cur = (r[currencyI] ?? "").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(cur)) {
      rejectReasons["currency not ISO-4217"] = (rejectReasons["currency not ISO-4217"] ?? 0) + 1;
      continue;
    }
    const group = groupI >= 0 ? ((r[groupI] ?? "").trim() || null) : null;
    const region = regionI >= 0 ? ((r[regionI] ?? "").trim() || null) : null;
    const costMinor = Math.round(cost * 100);

    rows.push({
      usageDate: date,
      provider: "azure",
      service,
      resourceGroup: group,
      region,
      costMinor,
      costBasis: "billed",
      currency: cur,
      source: "azure_cost_management",
    });
    services.add(service);
    if (date < start) start = date;
    if (date > end) end = date;
    totalMinor += costMinor;
    if (currency && currency !== cur) {
      // Cost Management exports never mix currencies within one tenant, but
      // if a customer merged files, block the whole batch — do not silently
      // sum incompatible units.
      rejectReasons["mixed currencies in file"] = (rejectReasons["mixed currencies in file"] ?? 0) + 1;
    }
    currency = cur;
  }

  return {
    totalRows: body.length,
    validRows: rows.length,
    rejectedRows: body.length - rows.length,
    rejectReasons,
    dateRange: rows.length > 0 ? { start, end } : null,
    distinctServices: services.size,
    totalMinor,
    currency,
    rows,
  };
}

function normaliseDate(v: string): string | null {
  const s = v.trim();
  if (ISO_DATE.test(s)) return s;
  const m = DDMMYYYY.exec(s);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // Try Date parsing as last resort (e.g. "2026-08-01T00:00:00Z").
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

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
