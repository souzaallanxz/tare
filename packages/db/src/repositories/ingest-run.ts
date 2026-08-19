import type { IsoDate } from "@tare/core";
import type { TenantContext } from "../tenant-context.ts";

export type IngestStatus = "queued" | "running" | "succeeded" | "failed" | "partial";

export type IngestRun = {
  id: string;
  source: string;
  windowStart: IsoDate;
  windowEnd: IsoDate;
  status: IngestStatus;
  rowsRead: number;
  rowsUpserted: number;
  startedAt: string | null;
  finishedAt: string | null;
  errorClass: string | null;
  errorMessage: string | null;
  attempts: number;
};

export async function enqueueIngestRun(
  ctx: TenantContext,
  source: string,
  windowStart: IsoDate,
  windowEnd: IsoDate,
  connectionId: string | null,
): Promise<string> {
  const res = await ctx.query<{ id: string }>(
    `INSERT INTO ingest_run (tenant_id, connection_id, source, window_start, window_end, status)
     VALUES ($1, $2, $3, $4, $5, 'queued') RETURNING id`,
    [ctx.tenantId, connectionId, source, windowStart, windowEnd],
  );
  return res.rows[0]!.id;
}

export async function claimNext(ctx: TenantContext, leaseSeconds = 600): Promise<IngestRun | null> {
  const res = await ctx.query<IngestRunRow>(
    `WITH claimed AS (
       SELECT id FROM ingest_run
       WHERE tenant_id = $1
         AND (status = 'queued' OR (status = 'running' AND lease_expires_at < now()))
       ORDER BY created_at
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     UPDATE ingest_run r
     SET status = 'running',
         started_at = COALESCE(r.started_at, now()),
         lease_expires_at = now() + ($2 || ' seconds')::interval,
         attempts = r.attempts + 1
     FROM claimed
     WHERE r.id = claimed.id
     RETURNING r.*`,
    [ctx.tenantId, leaseSeconds],
  );
  return res.rows[0] ? toIngestRun(res.rows[0]) : null;
}

export async function completeIngestRun(
  ctx: TenantContext,
  id: string,
  rowsRead: number,
  rowsUpserted: number,
): Promise<void> {
  await ctx.query(
    `UPDATE ingest_run
     SET status='succeeded', finished_at=now(),
         rows_read=$3, rows_upserted=$4, lease_expires_at=NULL
     WHERE tenant_id=$1 AND id=$2`,
    [ctx.tenantId, id, rowsRead, rowsUpserted],
  );
}

export async function failIngestRun(
  ctx: TenantContext,
  id: string,
  errorClass: string,
  errorMessage: string,
): Promise<void> {
  await ctx.query(
    `UPDATE ingest_run
     SET status='failed', finished_at=now(),
         error_class=$3, error_message=$4, lease_expires_at=NULL
     WHERE tenant_id=$1 AND id=$2`,
    [ctx.tenantId, id, errorClass, errorMessage],
  );
}

type IngestRunRow = {
  id: string;
  source: string;
  window_start: string;
  window_end: string;
  status: IngestStatus;
  rows_read: number;
  rows_upserted: number;
  started_at: Date | null;
  finished_at: Date | null;
  error_class: string | null;
  error_message: string | null;
  attempts: number;
};

function toIngestRun(r: IngestRunRow): IngestRun {
  return {
    id: r.id,
    source: r.source,
    windowStart: r.window_start,
    windowEnd: r.window_end,
    status: r.status,
    rowsRead: r.rows_read,
    rowsUpserted: r.rows_upserted,
    startedAt: r.started_at?.toISOString() ?? null,
    finishedAt: r.finished_at?.toISOString() ?? null,
    errorClass: r.error_class,
    errorMessage: r.error_message,
    attempts: r.attempts,
  };
}
