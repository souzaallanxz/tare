"use server";

import { revalidatePath } from "next/cache";
import { withTenant } from "@tare/db";
import {
  analyzeCsv,
  csvSource,
  detectFindings,
  reclassifyUsage,
  recomputeRollups,
  resolveAttribution,
  runIngestion,
  type CsvAnalysis,
} from "@tare/ingest";
import { requireSession } from "../../lib/session";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB in-memory ceiling; larger belongs on object storage

export async function analyzeCsvAction(
  csv: string,
): Promise<{ ok: true; analysis: CsvAnalysis } | { ok: false; error: string }> {
  await requireSession();
  if (!csv || csv.trim().length === 0) return { ok: false, error: "CSV is empty" };
  if (csv.length > MAX_BYTES) return { ok: false, error: `CSV exceeds ${MAX_BYTES / 1024 / 1024} MB in-memory limit` };
  try {
    const analysis = analyzeCsv(csv);
    return { ok: true, analysis };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Parse error" };
  }
}

export async function importCsvAction(
  csv: string,
): Promise<
  | { ok: true; rows: number; findings: number }
  | { ok: false; error: string }
> {
  const session = await requireSession();
  if (!csv || csv.trim().length === 0) return { ok: false, error: "CSV is empty" };
  if (csv.length > MAX_BYTES) return { ok: false, error: "CSV exceeds size limit" };

  const analysis = analyzeCsv(csv);
  if (analysis.missing.length > 0) {
    return { ok: false, error: `Missing required columns: ${analysis.missing.join(", ")}` };
  }
  if (analysis.validRows === 0) {
    return { ok: false, error: "No valid rows to import." };
  }

  const source = csvSource({
    url: "inline://csv",
    columnMap: analysis.columnMap,
    currency: session.activeTenant.currency as "EUR" | "USD",
    fetcher: async () => csv,
  });

  try {
    const result = await withTenant(session.activeTenant.id, async (ctx) => {
      const from = analysis.dateRange!.start;
      const to = analysis.dateRange!.end;
      const stats = await runIngestion(ctx, source, null, { from, to });
      await resolveAttribution(ctx);
      await reclassifyUsage(ctx, { from, to });
      await recomputeRollups(ctx, from, to);
      const findings = await detectFindings(ctx, session.activeTenant.currency as "EUR" | "USD");
      return { rows: stats.rowsUpserted, findings: findings.findings };
    });

    revalidatePath("/overview");
    revalidatePath("/ledger");
    revalidatePath("/savings");
    revalidatePath("/import");
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Import failed" };
  }
}
