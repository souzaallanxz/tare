import { Pool, types } from "pg";

// pg parses DATE as JS Date which drops UTC. We want the ISO string as stored.
types.setTypeParser(1082, (v: string) => v);
// BIGINT → string by default; parse to number since we cap monetary at safe int range.
// Amounts above 2^53 minor units would be nine quadrillion euros; not our decade.
types.setTypeParser(20, (v: string) => Number(v));

let pool: Pool | null = null;

export function getPool(url?: string): Pool {
  if (pool) return pool;
  const connectionString = url ?? process.env["DATABASE_URL"];
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  pool = new Pool({
    connectionString,
    max: Number(process.env["DATABASE_POOL_MAX"] ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  pool.on("error", (err) => {
    console.error("[pg] idle client error", err.message);
  });
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
