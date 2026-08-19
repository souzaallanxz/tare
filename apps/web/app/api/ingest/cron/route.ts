import { NextResponse } from "next/server";

/**
 * Hourly scheduler entrypoint. In Phase 1a this is called by Vercel Cron; it
 * decides which tenants need a run and enqueues one ingest_run each.
 * The worker (deployed separately or on-demand) consumes with
 * FOR UPDATE SKIP LOCKED — see @tare/db/repositories/ingest-run.ts.
 *
 * Guarded by CRON_SECRET so it cannot be triggered from the internet.
 */
export async function GET(req: Request): Promise<Response> {
  const authz = req.headers.get("authorization");
  const expected = `Bearer ${process.env["CRON_SECRET"] ?? ""}`;
  if (!process.env["CRON_SECRET"] || authz !== expected) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Phase 0: no-op. Wire tenant scheduling here once the connection screen writes rows.
  return NextResponse.json({ enqueued: 0, at: new Date().toISOString() });
}
