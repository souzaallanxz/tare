"use server";

import { revalidatePath } from "next/cache";
import { withTenant } from "@tare/db";
import { clearCloudInfra, upsertCloudInfra } from "@tare/db/repositories";
import { analyzeAzureCsv, type AzureAnalysis } from "@tare/ingest";
import { requireSession } from "../../lib/session";

const MAX_BYTES = 20 * 1024 * 1024;

export async function analyzeAzureAction(
  csv: string,
): Promise<{ ok: true; analysis: Omit<AzureAnalysis, "rows"> } | { ok: false; error: string }> {
  await requireSession();
  if (!csv || csv.trim().length === 0) return { ok: false, error: "CSV is empty" };
  if (csv.length > MAX_BYTES) return { ok: false, error: "CSV exceeds 20 MB in-memory limit" };
  try {
    const { rows: _rows, ...analysis } = analyzeAzureCsv(csv);
    return { ok: true, analysis };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Parse error" };
  }
}

export async function importAzureAction(
  csv: string,
): Promise<{ ok: true; rows: number } | { ok: false; error: string }> {
  const session = await requireSession();
  if (!csv || csv.trim().length === 0) return { ok: false, error: "CSV is empty" };
  if (csv.length > MAX_BYTES) return { ok: false, error: "CSV exceeds size limit" };

  const analysis = analyzeAzureCsv(csv);
  if (analysis.validRows === 0) {
    return {
      ok: false,
      error: analysis.rejectReasons["header: missing " + Object.keys(analysis.rejectReasons)[0]!]
        ? Object.keys(analysis.rejectReasons)[0]!
        : "No valid rows to import.",
    };
  }

  await withTenant(session.activeTenant.id, (ctx) => upsertCloudInfra(ctx, analysis.rows));

  revalidatePath("/settings");
  revalidatePath("/overview");
  return { ok: true, rows: analysis.rows.length };
}

export async function clearAzureAction(): Promise<void> {
  const session = await requireSession();
  await withTenant(session.activeTenant.id, (ctx) => clearCloudInfra(ctx, "azure"));
  revalidatePath("/settings");
  revalidatePath("/overview");
}
