import type { TenantContext } from "../tenant-context.ts";

export type Member = {
  userId: string;
  name: string;
  email: string;
  role: "owner" | "member";
  createdAt: string;
};

export type Invitation = {
  id: string;
  email: string;
  role: "owner" | "member";
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};

export async function listMembers(ctx: TenantContext): Promise<Member[]> {
  const res = await ctx.query<{
    user_id: string;
    name: string;
    email: string;
    role: "owner" | "member";
    created_at: Date;
  }>(
    `SELECT m.user_id, u.name, u.email, m.role::text AS role, m.created_at
     FROM membership m
     JOIN "user" u ON u.id = m.user_id
     WHERE m.tenant_id = $1
     ORDER BY m.created_at`,
    [ctx.tenantId],
  );
  return res.rows.map((r) => ({
    userId: r.user_id,
    name: r.name,
    email: r.email,
    role: r.role,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function listInvitations(ctx: TenantContext): Promise<Invitation[]> {
  const res = await ctx.query<{
    id: string;
    email: string;
    role: "owner" | "member";
    expires_at: Date;
    accepted_at: Date | null;
    created_at: Date;
  }>(
    `SELECT id, email, role::text AS role, expires_at, accepted_at, created_at
     FROM invitation
     WHERE tenant_id = $1 AND accepted_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC`,
    [ctx.tenantId],
  );
  return res.rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    expiresAt: r.expires_at.toISOString(),
    acceptedAt: r.accepted_at?.toISOString() ?? null,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function createInvitation(
  ctx: TenantContext,
  input: { email: string; role: "owner" | "member"; tokenHash: string; invitedBy: string; ttlSeconds?: number },
): Promise<string> {
  const ttl = input.ttlSeconds ?? 60 * 60 * 72; // 72 hours per §3.4
  const res = await ctx.query<{ id: string }>(
    `INSERT INTO invitation (tenant_id, email, role, token_hash, expires_at, invited_by)
     VALUES ($1, $2, $3, $4, now() + ($5 || ' seconds')::interval, $6)
     ON CONFLICT (token_hash) DO NOTHING
     RETURNING id`,
    [ctx.tenantId, input.email, input.role, input.tokenHash, ttl, input.invitedBy],
  );
  const row = res.rows[0];
  if (!row) throw new Error("invitation token collision");
  return row.id;
}

export async function revokeInvitation(ctx: TenantContext, id: string): Promise<void> {
  await ctx.query(
    `DELETE FROM invitation WHERE tenant_id = $1 AND id = $2 AND accepted_at IS NULL`,
    [ctx.tenantId, id],
  );
}

export async function removeMember(ctx: TenantContext, userId: string): Promise<void> {
  await ctx.query(
    `DELETE FROM membership WHERE tenant_id = $1 AND user_id = $2 AND role = 'member'`,
    [ctx.tenantId, userId],
  );
}
