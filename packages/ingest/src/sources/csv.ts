import type { Capability } from "@tare/core";
import { money } from "@tare/core";
import type { IngestBatch, Source } from "../source.ts";

const CAPABILITIES: ReadonlySet<Capability> = new Set(["usage_daily"]);

export type CsvSourceConfig = {
  readonly url: string;                     // presigned link to the uploaded file
  readonly columnMap: Readonly<Record<string, string>>;
  readonly currency: "EUR" | "USD";
  fetcher?: (url: string) => Promise<ReadableStream<Uint8Array> | string>;
};

/**
 * Streams a system.billing.usage CSV export.
 * Capabilities: usage_daily only — rules that need cluster config or job timeline
 * will be reported as unavailable, not run with defaults.
 */
export function csvSource(cfg: CsvSourceConfig): Source {
  return {
    name: "csv_import",
    capabilities: CAPABILITIES,
    async *fetch() {
      const raw = await (cfg.fetcher ?? defaultFetcher)(cfg.url);
      const text = typeof raw === "string" ? raw : await streamToText(raw);
      const rows = parseCsv(text);
      const [header, ...rest] = rows;
      if (!header) return;

      const idx = (name: string): number => {
        const mapped = cfg.columnMap[name] ?? name;
        const i = header.indexOf(mapped);
        if (i < 0) throw new Error(`CSV missing column ${mapped} (mapped from ${name})`);
        return i;
      };

      const dateI = idx("usage_date");
      const skuI = idx("sku_name");
      const qtyI = idx("usage_quantity");
      const priceI = idx("list_price");
      const entityI = idx("entity_id");

      const usage = rest.map((r) => {
        const listCostMinor = Math.round(Number(r[qtyI]) * Number(r[priceI]) * 100);
        return {
          usageDate: String(r[dateI]),
          entityKind: "cluster" as const,
          entityExternalId: String(r[entityI]),
          entityName: String(r[entityI]),
          sku: String(r[skuI]),
          dbus: Number(r[qtyI]),
          cost: money(listCostMinor, cfg.currency, "estimated", String(r[dateI])),
          listCostMinor,
          tags: {},
          runAs: null,
          creator: null,
        };
      });

      yield { usage, configs: [] } satisfies IngestBatch;
    },
  };
}

async function defaultFetcher(url: string): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`CSV fetch failed: ${res.status}`);
  return res.body;
}

async function streamToText(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text();
}

// Minimal RFC 4180-ish parser. Enough for Databricks exports.
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      out.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // ignore
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    out.push(row);
  }
  return out;
}
