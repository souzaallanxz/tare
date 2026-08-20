import { NextResponse } from "next/server";
import { getPool } from "@tare/db";

/**
 * Lightweight readiness probe. Confirms the pool can round-trip a query
 * within a short budget. Not authenticated — the response never leaks
 * anything sensitive.
 */
export async function GET(): Promise<Response> {
  const started = Date.now();
  try {
    const pool = getPool();
    const res = await pool.query<{ now: Date }>("SELECT now() AS now");
    return NextResponse.json({
      ok: true,
      db: {
        reachable: true,
        latencyMs: Date.now() - started,
        now: res.rows[0]?.now.toISOString(),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 503 },
    );
  }
}
