import { withoutTenant } from "@tare/db";
import { fromAddress, mailer } from "./mailer";

/**
 * Notify every owner-role member when an ingestion run fails. Best-effort:
 * a mail failure never bubbles up into the ingestion flow — worst case the
 * founder catches it in the ingest history table on the Settings screen.
 */
export async function notifyIngestFailure(
  tenantId: string,
  ctx: {
    source: string;
    errorClass: string;
    errorMessage: string;
    windowStart: string;
    windowEnd: string;
  },
): Promise<void> {
  try {
    const rows = await withoutTenant(async (client) => {
      const r = await client.query<{ name: string; email: string; tenant_name: string }>(
        `SELECT u.name, u.email, t.name AS tenant_name
         FROM membership m
         JOIN "user" u ON u.id = m.user_id
         JOIN tenant t ON t.id = m.tenant_id
         WHERE m.tenant_id = $1 AND m.role = 'owner'`,
        [tenantId],
      );
      return r.rows;
    });
    if (rows.length === 0) return;

    const tenantName = rows[0]!.tenant_name;
    const send = mailer();
    const from = fromAddress();
    await send({
      to: rows.map((r) => r.email),
      from,
      subject: `Tare · ingestion failed for ${tenantName}`,
      html: buildHtml({ tenantName, ...ctx }),
    });
  } catch (err) {
    console.error(
      `[notify] ingest failure notification failed for tenant ${tenantId}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

function buildHtml(input: {
  tenantName: string;
  source: string;
  errorClass: string;
  errorMessage: string;
  windowStart: string;
  windowEnd: string;
}): string {
  const esc = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  return `<!doctype html>
<html><body style="margin:0;background:#F1F3F6;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#101A2B">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="640" style="width:640px;max-width:100%;background:#FFFFFF;border:1px solid #D7DDE5">
        <tr><td style="padding:22px 24px;border-bottom:1px solid #D7DDE5">
          <div style="font-weight:500;font-size:16px">Ingestion failed for ${esc(input.tenantName)}</div>
        </td></tr>
        <tr><td style="padding:22px 24px">
          <p style="margin:0 0 14px;font-size:14px">
            Source: <span style="font-family:ui-monospace,Menlo,Consolas,monospace">${esc(input.source)}</span>.
            Window: <span style="font-family:ui-monospace,Menlo,Consolas,monospace">${esc(input.windowStart)} → ${esc(input.windowEnd)}</span>.
          </p>
          <p style="margin:0 0 6px;font-size:14px">Classification: <b>${esc(input.errorClass)}</b></p>
          <pre style="margin:0;padding:12px 14px;background:#101A2B;color:#C6CEDA;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;white-space:pre-wrap;overflow:auto">${esc(input.errorMessage)}</pre>
          <p style="margin:16px 0 0;font-size:13px;color:#5A6675">
            The next scheduled run will retry automatically. Auth or permission failures do not
            recover on their own — check the Connection screen.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
