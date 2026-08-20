import { NextResponse } from "next/server";
import { withoutTenant, withTenant } from "@tare/db";
import {
  detectAnomaliesForTenant,
  detectFindings,
  fakeSource,
  reclassifyUsage,
  recomputeRollups,
  resolveAttribution,
  runIngestion,
  sweepVerifications,
  databricksSource,
} from "@tare/ingest";
import {
  getConnection,
  loadSealedSecret,
} from "@tare/db/repositories";
import { deserialize, envKekProvider, open } from "@tare/crypto";
import { addDays, toIsoDate } from "@tare/core";

/**
 * Hourly ingestion scheduler. Fires for every tenant with an 'ok' workspace
 * connection (or when USE_FAKE_INGEST=1, every tenant with a connection at all).
 *
 * Synchronous per-tenant while the fleet is small. Migrates to a durable
 * queue (Inngest / Trigger.dev) when a run exceeds function timeout or
 * tenant count crosses ~20, per §4.4 of the design.
 *
 * Guarded by CRON_SECRET.
 */
export async function GET(req: Request): Promise<Response> {
  const authz = req.headers.get("authorization");
  const expected = `Bearer ${process.env["CRON_SECRET"] ?? ""}`;
  if (!process.env["CRON_SECRET"] || authz !== expected) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const useFake = process.env["USE_FAKE_INGEST"] === "1";
  const tenants = await withoutTenant(async (client) => {
    const res = await client.query<{ id: string }>(
      `SELECT id FROM tenant WHERE deleted_at IS NULL`,
    );
    return res.rows;
  });

  const end = toIsoDate(new Date());
  const start = addDays(end, -3);
  const results: Array<{ tenant: string; rows?: number; error?: string; skipped?: string }> = [];

  for (const t of tenants) {
    try {
      const result = await withTenant(t.id, async (ctx) => {
        const conn = await getConnection(ctx);
        if (!conn && !useFake) return { skipped: "no connection" as const };
        if (conn && conn.status !== "ok" && !useFake) return { skipped: `status=${conn.status}` as const };

        const source =
          useFake || !conn
            ? fakeSource({ currency: "EUR" })
            : await buildDatabricksSource(ctx, conn);

        const stats = await runIngestion(ctx, source, conn?.id ?? null, { from: start, to: end });
        await resolveAttribution(ctx);
        await reclassifyUsage(ctx, { from: start, to: end });
        await recomputeRollups(ctx, start, end);
        await detectFindings(ctx, "EUR");
        await detectAnomaliesForTenant(ctx);
        await sweepVerifications(ctx);
        return { rows: stats.rowsUpserted };
      });
      results.push({ tenant: t.id, ...result });
    } catch (err) {
      results.push({ tenant: t.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ at: new Date().toISOString(), results });
}

async function buildDatabricksSource(
  ctx: import("@tare/db").TenantContext,
  conn: NonNullable<Awaited<ReturnType<typeof getConnection>>>,
) {
  const secretRow = await loadSealedSecret(ctx, conn.id);
  if (!secretRow) throw new Error("Sealed secret missing at ingestion time");
  const clientSecret = open(deserialize(secretRow.sealed.toString("utf8")), envKekProvider());
  return databricksSource({
    host: conn.host,
    clientId: conn.clientId,
    clientSecret,
    warehouseId: conn.warehouseId ?? "",
    currency: "EUR",
  });
}
