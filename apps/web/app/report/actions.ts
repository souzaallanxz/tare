"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withTenant } from "@tare/db";
import {
  addReportRecipient,
  listReportRecipients,
  recordReportRun,
  removeReportRecipient,
} from "@tare/db/repositories";
import { renderWeeklyReport } from "@tare/email";
import { requireSession } from "../../lib/session";
import { fromAddress, mailer } from "../../lib/mailer";
import { buildWeeklyReport } from "../../lib/weekly-report";

const recipientSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().max(120).optional(),
});

export async function addRecipientAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSession();
  const parsed = recipientSchema.safeParse({
    email: formData.get("email"),
    name: (formData.get("name") as string) || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  await withTenant(session.activeTenant.id, (ctx) =>
    addReportRecipient(ctx, { email: parsed.data.email, name: parsed.data.name ?? null, cadence: "weekly" }),
  );
  revalidatePath("/report");
  return { ok: true };
}

export async function removeRecipientAction(id: string): Promise<void> {
  const session = await requireSession();
  await withTenant(session.activeTenant.id, (ctx) => removeReportRecipient(ctx, id));
  revalidatePath("/report");
}

export async function sendReportAction(
  scope: "test" | "all",
): Promise<{ ok: true; sent: number } | { ok: false; error: string }> {
  const session = await requireSession();
  try {
    const report = await buildWeeklyReport(session.activeTenant.id, session.activeTenant.name);
    const html = renderWeeklyReport(report);

    const recipients =
      scope === "test"
        ? [session.user.email]
        : (await withTenant(session.activeTenant.id, (ctx) => listReportRecipients(ctx, "weekly"))).map((r) => r.email);

    if (recipients.length === 0) {
      return { ok: false, error: "No recipients configured." };
    }

    const send = mailer();
    await send({
      to: recipients,
      from: fromAddress(),
      subject: `Tare weekly · ${session.activeTenant.name}`,
      html,
    });

    const period = `weekly:${isoWeekLabel(new Date())}`;
    await withTenant(session.activeTenant.id, (ctx) =>
      recordReportRun(ctx, period, recipients, report),
    );

    return { ok: true, sent: recipients.length };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
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
