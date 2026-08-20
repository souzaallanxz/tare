import type { TenantContext } from "../tenant-context.ts";

export type ReportRecipient = {
  id: string;
  email: string;
  name: string | null;
  cadence: "weekly" | "monthly";
  active: boolean;
};

export async function listReportRecipients(ctx: TenantContext, cadence: "weekly" | "monthly" = "weekly"): Promise<ReportRecipient[]> {
  const res = await ctx.query<ReportRecipient>(
    `SELECT id, email, name, cadence, active
     FROM report_recipient
     WHERE tenant_id = $1 AND cadence = $2 AND active = true
     ORDER BY email`,
    [ctx.tenantId, cadence],
  );
  return res.rows;
}

export async function addReportRecipient(
  ctx: TenantContext,
  input: { email: string; name?: string | null; cadence: "weekly" | "monthly" },
): Promise<string> {
  const res = await ctx.query<{ id: string }>(
    `INSERT INTO report_recipient (tenant_id, email, name, cadence, active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (tenant_id, email, cadence) DO UPDATE SET active = true, name = EXCLUDED.name
     RETURNING id`,
    [ctx.tenantId, input.email, input.name ?? null, input.cadence],
  );
  return res.rows[0]!.id;
}

export async function removeReportRecipient(ctx: TenantContext, id: string): Promise<void> {
  await ctx.query(
    `UPDATE report_recipient SET active = false WHERE tenant_id = $1 AND id = $2`,
    [ctx.tenantId, id],
  );
}

/** Idempotent per (tenant, period). Returns existing id or new id. */
export async function recordReportRun(
  ctx: TenantContext,
  period: string,
  recipients: string[],
  payload: unknown,
): Promise<string> {
  const res = await ctx.query<{ id: string }>(
    `INSERT INTO report_run (tenant_id, period, sent_at, recipients, payload)
     VALUES ($1, $2, now(), $3::jsonb, $4::jsonb)
     ON CONFLICT (tenant_id, period) DO UPDATE
       SET sent_at = EXCLUDED.sent_at,
           recipients = EXCLUDED.recipients,
           payload = EXCLUDED.payload
     RETURNING id`,
    [ctx.tenantId, period, JSON.stringify(recipients), JSON.stringify(payload ?? {})],
  );
  return res.rows[0]!.id;
}
