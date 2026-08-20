"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withTenant } from "@tare/db";
import { deleteBudget, upsertBudget } from "@tare/db/repositories";
import { requireSession } from "../../lib/session";

const schema = z.object({
  scopeType: z.enum(["workspace", "owner"]),
  ownerId: z.string().uuid().optional().or(z.literal("")),
  period: z.enum(["monthly", "quarterly"]),
  limitEuros: z.coerce.number().positive().max(100_000_000),
  thresholdPct: z.coerce.number().int().min(1).max(100),
});

export async function saveBudgetAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSession();
  const parsed = schema.safeParse({
    scopeType: formData.get("scopeType"),
    ownerId: formData.get("ownerId") ?? "",
    period: formData.get("period"),
    limitEuros: formData.get("limitEuros"),
    thresholdPct: formData.get("thresholdPct"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const scope =
    parsed.data.scopeType === "workspace"
      ? { type: "workspace" as const }
      : { type: "owner" as const, ownerId: parsed.data.ownerId ?? "" };
  if (scope.type === "owner" && !scope.ownerId) {
    return { ok: false, error: "Choose an owner." };
  }

  await withTenant(session.activeTenant.id, (ctx) =>
    upsertBudget(ctx, {
      scope,
      period: parsed.data.period,
      limitMinor: Math.round(parsed.data.limitEuros * 100),
      thresholdPct: parsed.data.thresholdPct,
      currency: session.activeTenant.currency,
    }),
  );
  revalidatePath("/settings");
  revalidatePath("/overview");
  return { ok: true };
}

export async function deleteBudgetAction(id: string): Promise<void> {
  const session = await requireSession();
  await withTenant(session.activeTenant.id, (ctx) => deleteBudget(ctx, id));
  revalidatePath("/settings");
  revalidatePath("/overview");
}
