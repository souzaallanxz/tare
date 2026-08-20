import type { IsoDate } from "@tare/core";
import type { TenantContext } from "../tenant-context.ts";

export type RateCardEntry = {
  sku: string;
  rateMinor: number;
  currency: string;
  effectiveFrom: IsoDate;
};

export async function listRateCard(ctx: TenantContext): Promise<RateCardEntry[]> {
  const res = await ctx.query<{
    sku: string;
    rate_minor: number;
    currency: string;
    effective_from: string;
  }>(
    `SELECT sku, rate_minor, currency, effective_from
     FROM rate_card
     WHERE tenant_id = $1
     ORDER BY sku, effective_from DESC`,
    [ctx.tenantId],
  );
  return res.rows.map((r) => ({
    sku: r.sku,
    rateMinor: Number(r.rate_minor),
    currency: r.currency,
    effectiveFrom: r.effective_from,
  }));
}

/** Fully replaces the rate card. Simpler than per-row diffs and cheap at this size. */
export async function replaceRateCard(
  ctx: TenantContext,
  entries: readonly RateCardEntry[],
): Promise<number> {
  await ctx.query(`DELETE FROM rate_card WHERE tenant_id = $1`, [ctx.tenantId]);
  if (entries.length === 0) return 0;
  const values: unknown[] = [];
  const tuples = entries.map((e, i) => {
    const p = i * 4;
    values.push(ctx.tenantId, e.sku, e.rateMinor, e.effectiveFrom);
    return `($${p + 1}, $${p + 2}, $${p + 3}, ${sqlLit(e.currency)}, $${p + 4})`;
  });
  const res = await ctx.query(
    `INSERT INTO rate_card (tenant_id, sku, rate_minor, currency, effective_from)
     VALUES ${tuples.join(", ")}`,
    values,
  );
  return res.rowCount ?? 0;
}

export async function clearRateCard(ctx: TenantContext): Promise<void> {
  await ctx.query(`DELETE FROM rate_card WHERE tenant_id = $1`, [ctx.tenantId]);
}

export async function rateCardSummary(ctx: TenantContext): Promise<{ entries: number; skus: number }> {
  const res = await ctx.query<{ entries: number; skus: number }>(
    `SELECT COUNT(*)::int AS entries, COUNT(DISTINCT sku)::int AS skus
     FROM rate_card WHERE tenant_id = $1`,
    [ctx.tenantId],
  );
  return res.rows[0] ?? { entries: 0, skus: 0 };
}

// Escape a currency code for inlining. All values pass the ISO check upstream,
// but be paranoid — a stray character here would be a SQL injection.
function sqlLit(currency: string): string {
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error(`Invalid currency: ${currency}`);
  return `'${currency}'`;
}
