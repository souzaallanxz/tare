import type { PoolClient, QueryResult, QueryResultRow } from "pg";
import { getPool } from "./client.ts";

/**
 * A TenantContext is the only way to reach the database from application code.
 * The constructor is not exported — call `withTenant(id, fn)` and receive one
 * bound to a checked-out client. The RLS policies also enforce isolation, but
 * the type here is the primary guarantee: a repository function cannot compile
 * without one.
 */
export class TenantContext {
  readonly tenantId: string;
  readonly #client: PoolClient;

  constructor(tenantId: string, client: PoolClient) {
    this.tenantId = tenantId;
    this.#client = client;
  }

  async query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: readonly unknown[],
  ): Promise<QueryResult<R>> {
    return this.#client.query<R>(text, params as unknown[] | undefined);
  }
}

export async function withTenant<T>(
  tenantId: string,
  fn: (ctx: TenantContext) => Promise<T>,
): Promise<T> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
    throw new Error(`Invalid tenantId: ${tenantId}`);
  }
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    // Transaction-scoped GUC. RLS policies read it via tare_tenant_id().
    await client.query("SELECT set_config('tare.tenant_id', $1, true)", [tenantId]);
    const ctx = new TenantContext(tenantId, client);
    const out = await fn(ctx);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Escape hatch — for cross-tenant admin work (migrations, health checks). Never used from request handlers. */
export async function withoutTenant<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
