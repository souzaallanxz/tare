import { withTenant } from "@tare/db";

export type IngestHistoryRow = {
  id: string;
  source: string;
  status: string;
  windowStart: string;
  windowEnd: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  rowsUpserted: number;
  attempts: number;
  errorClass: string | null;
  errorMessage: string | null;
};

export async function listRecentIngestRuns(
  tenantId: string,
  limit = 15,
): Promise<IngestHistoryRow[]> {
  return withTenant(tenantId, async (ctx) => {
    const res = await ctx.query<{
      id: string;
      source: string;
      status: string;
      window_start: string;
      window_end: string;
      started_at: Date | null;
      finished_at: Date | null;
      rows_upserted: number;
      attempts: number;
      error_class: string | null;
      error_message: string | null;
    }>(
      `SELECT id, source, status::text AS status,
              window_start::text AS window_start,
              window_end::text AS window_end,
              started_at, finished_at, rows_upserted, attempts,
              error_class, error_message
       FROM ingest_run
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [ctx.tenantId, limit],
    );
    return res.rows.map((r) => ({
      id: r.id,
      source: r.source,
      status: r.status,
      windowStart: r.window_start,
      windowEnd: r.window_end,
      startedAt: r.started_at?.toISOString() ?? null,
      finishedAt: r.finished_at?.toISOString() ?? null,
      durationMs:
        r.started_at && r.finished_at
          ? r.finished_at.getTime() - r.started_at.getTime()
          : null,
      rowsUpserted: Number(r.rows_upserted),
      attempts: r.attempts,
      errorClass: r.error_class,
      errorMessage: r.error_message,
    }));
  });
}
