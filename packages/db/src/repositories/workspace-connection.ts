import type { TenantContext } from "../tenant-context.ts";

export type ConnectionStatus =
  | "pending"
  | "ok"
  | "auth_failed"
  | "permission"
  | "schema_drift"
  | "quota"
  | "error";

export type WorkspaceConnection = {
  id: string;
  host: string;
  clientId: string;
  warehouseId: string | null;
  status: ConnectionStatus;
  statusMessage: string | null;
  lastOkAt: string | null;
  createdAt: string;
};

/**
 * Store a workspace connection. The client secret is envelope-encrypted
 * upstream and passed as a serialized byte-array reference (`sealed_bytes`).
 * The secret NEVER touches the database in plaintext.
 */
export async function upsertConnection(
  ctx: TenantContext,
  input: {
    host: string;
    clientId: string;
    warehouseId: string | null;
    sealedBytes: Uint8Array;
    kekVersion: number;
  },
): Promise<string> {
  // Row per (tenant, host); rotating the secret overwrites in place.
  const secretRes = await ctx.query<{ id: string }>(
    `INSERT INTO secret_material (tenant_id, purpose, sealed, kek_version)
     VALUES ($1, 'workspace_connection', $2, $3)
     RETURNING id`,
    [ctx.tenantId, input.sealedBytes, input.kekVersion],
  );
  const secretRef = secretRes.rows[0]!.id;

  const conn = await ctx.query<{ id: string }>(
    `INSERT INTO workspace_connection
       (tenant_id, host, client_id, secret_ref, warehouse_id, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     ON CONFLICT (tenant_id, host) DO UPDATE SET
       client_id = EXCLUDED.client_id,
       secret_ref = EXCLUDED.secret_ref,
       warehouse_id = EXCLUDED.warehouse_id,
       status = 'pending',
       status_message = NULL
     RETURNING id`,
    [ctx.tenantId, input.host, input.clientId, secretRef, input.warehouseId],
  );
  return conn.rows[0]!.id;
}

export async function getConnection(ctx: TenantContext): Promise<WorkspaceConnection | null> {
  const res = await ctx.query<ConnectionRow>(
    `SELECT id, host, client_id, warehouse_id, status::text AS status,
            status_message, last_ok_at, created_at
     FROM workspace_connection
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [ctx.tenantId],
  );
  return res.rows[0] ? toConnection(res.rows[0]) : null;
}

export async function loadSealedSecret(
  ctx: TenantContext,
  connectionId: string,
): Promise<{ sealed: Buffer; kekVersion: number } | null> {
  const res = await ctx.query<{ sealed: Buffer; kek_version: number }>(
    `SELECT sm.sealed, sm.kek_version
     FROM workspace_connection wc
     JOIN secret_material sm ON sm.id = wc.secret_ref
     WHERE wc.tenant_id = $1 AND wc.id = $2`,
    [ctx.tenantId, connectionId],
  );
  const row = res.rows[0];
  return row ? { sealed: row.sealed, kekVersion: row.kek_version } : null;
}

export async function updateConnectionStatus(
  ctx: TenantContext,
  connectionId: string,
  status: ConnectionStatus,
  message: string | null,
): Promise<void> {
  await ctx.query(
    `UPDATE workspace_connection
     SET status = $3::connection_status,
         status_message = $4,
         last_ok_at = CASE WHEN $3 = 'ok' THEN now() ELSE last_ok_at END
     WHERE tenant_id = $1 AND id = $2`,
    [ctx.tenantId, connectionId, status, message],
  );
}

type ConnectionRow = {
  id: string;
  host: string;
  client_id: string;
  warehouse_id: string | null;
  status: ConnectionStatus;
  status_message: string | null;
  last_ok_at: Date | null;
  created_at: Date;
};

function toConnection(r: ConnectionRow): WorkspaceConnection {
  return {
    id: r.id,
    host: r.host,
    clientId: r.client_id,
    warehouseId: r.warehouse_id,
    status: r.status,
    statusMessage: r.status_message,
    lastOkAt: r.last_ok_at?.toISOString() ?? null,
    createdAt: r.created_at.toISOString(),
  };
}
