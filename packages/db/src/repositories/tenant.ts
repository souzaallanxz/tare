import type { PoolClient } from "pg";
import { withoutTenant } from "../tenant-context.ts";

export type Tenant = {
  id: string;
  name: string;
  currency: string;
  createdAt: string;
};

export async function createTenant(name: string, currency = "EUR"): Promise<Tenant> {
  return withoutTenant(async (client: PoolClient) => {
    const res = await client.query<{
      id: string;
      name: string;
      currency: string;
      created_at: Date;
    }>(
      `INSERT INTO tenant (name, currency) VALUES ($1, $2)
       RETURNING id, name, currency, created_at`,
      [name, currency],
    );
    const row = res.rows[0]!;
    return {
      id: row.id,
      name: row.name,
      currency: row.currency,
      createdAt: row.created_at.toISOString(),
    };
  });
}

export async function tenantForUser(userId: string): Promise<Tenant[]> {
  return withoutTenant(async (client) => {
    const res = await client.query<{
      id: string;
      name: string;
      currency: string;
      created_at: Date;
    }>(
      `SELECT t.id, t.name, t.currency, t.created_at
       FROM tenant t
       JOIN membership m ON m.tenant_id = t.id
       WHERE m.user_id = $1 AND t.deleted_at IS NULL
       ORDER BY t.created_at`,
      [userId],
    );
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      currency: r.currency,
      createdAt: r.created_at.toISOString(),
    }));
  });
}
