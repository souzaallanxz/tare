import { NextResponse } from "next/server";
import { withoutTenant, withTenant } from "@tare/db";
import { listReportRecipients, recordReportRun } from "@tare/db/repositories";
import { renderWeeklyReport } from "@tare/email";
import { buildWeeklyReport } from "../../../../lib/weekly-report";
import { fromAddress, mailer } from "../../../../lib/mailer";

/**
 * Weekly report cron. Fires every Monday 07:00 CET via Vercel Cron
 * (see vercel.json). Iterates every active tenant with at least one
 * recipient, builds the report, records report_run, sends.
 *
 * Guarded by CRON_SECRET so it cannot be triggered from the internet.
 */
export async function GET(req: Request): Promise<Response> {
  const authz = req.headers.get("authorization");
  const expected = `Bearer ${process.env["CRON_SECRET"] ?? ""}`;
  if (!process.env["CRON_SECRET"] || authz !== expected) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const tenants = await withoutTenant(async (client) => {
    const res = await client.query<{ id: string; name: string }>(
      `SELECT id, name FROM tenant WHERE deleted_at IS NULL`,
    );
    return res.rows;
  });

  const send = mailer();
  const from = fromAddress();
  const period = isoWeekLabel(new Date());
  const results: Array<{ tenant: string; sent: number; error?: string }> = [];

  for (const tenant of tenants) {
    try {
      const recipients = await withTenant(tenant.id, (ctx) => listReportRecipients(ctx, "weekly"));
      if (recipients.length === 0) {
        results.push({ tenant: tenant.id, sent: 0 });
        continue;
      }
      const report = await buildWeeklyReport(tenant.id, tenant.name);
      await send({
        to: recipients.map((r) => r.email),
        from,
        subject: `Tare weekly · ${tenant.name}`,
        html: renderWeeklyReport(report),
      });
      await withTenant(tenant.id, (ctx) =>
        recordReportRun(ctx, `weekly:${period}`, recipients.map((r) => r.email), report),
      );
      results.push({ tenant: tenant.id, sent: recipients.length });
    } catch (err) {
      results.push({
        tenant: tenant.id,
        sent: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ period, results });
}

function isoWeekLabel(d: Date): string {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = (target.getTime() - firstThursday.getTime()) / 86_400_000;
  const week = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
