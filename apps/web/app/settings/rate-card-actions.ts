"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withTenant } from "@tare/db";
import { clearRateCard, replaceRateCard, type RateCardEntry } from "@tare/db/repositories";
import { reclassifyUsage } from "@tare/ingest";
import { requireSession } from "../../lib/session";

const entrySchema = z.object({
  sku: z.string().min(1).max(120),
  rateMinor: z.number().int().min(0),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

export async function uploadRateCardAction(
  formData: FormData,
): Promise<{ ok: true; entries: number; reclassified: number } | { ok: false; error: string }> {
  const session = await requireSession();
  const csv = String(formData.get("csv") ?? "").trim();
  if (!csv) return { ok: false, error: "CSV is empty" };

  let entries: RateCardEntry[];
  try {
    entries = parseRateCardCsv(csv, session.activeTenant.currency);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Parse error" };
  }
  if (entries.length === 0) return { ok: false, error: "No rows found in CSV" };

  const validation = entries.map((e) => entrySchema.safeParse(e)).find((r) => !r.success);
  if (validation && !validation.success) {
    return { ok: false, error: validation.error.issues[0]?.message ?? "Invalid row" };
  }

  const result = await withTenant(session.activeTenant.id, async (ctx) => {
    const inserted = await replaceRateCard(ctx, entries);
    const { updated } = await reclassifyUsage(ctx);
    return { inserted, updated };
  });

  revalidatePath("/settings");
  revalidatePath("/overview");
  revalidatePath("/ledger");
  return { ok: true, entries: result.inserted, reclassified: result.updated };
}

export async function clearRateCardAction(): Promise<{ reclassified: number }> {
  const session = await requireSession();
  const result = await withTenant(session.activeTenant.id, async (ctx) => {
    await clearRateCard(ctx);
    return reclassifyUsage(ctx);
  });
  revalidatePath("/settings");
  revalidatePath("/overview");
  revalidatePath("/ledger");
  return { reclassified: result.updated };
}

/**
 * Format expected:
 *   sku,rate,effective_from
 *   JOBS_COMPUTE,0.30,2025-01-01
 *
 * `rate` is in major units. `effective_from` is YYYY-MM-DD.
 * Header row optional. Anything after `#` on a line is a comment.
 */
function parseRateCardCsv(text: string, currency: string): RateCardEntry[] {
  const out: RateCardEntry[] = [];
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.split("#")[0]!.trim();
    if (!line) continue;
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 3) continue;
    const [sku, rateStr, effectiveFrom] = parts;
    if (!sku || !rateStr || !effectiveFrom) continue;
    if (/^sku$/i.test(sku)) continue; // header row
    const rate = Number(rateStr);
    if (!Number.isFinite(rate) || rate < 0) {
      throw new Error(`Invalid rate on line: ${line}`);
    }
    out.push({
      sku,
      rateMinor: Math.round(rate * 100),
      currency,
      effectiveFrom,
    });
  }
  return out;
}
