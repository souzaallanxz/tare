"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withTenant } from "@tare/db";
import {
  createAttributionRule,
  deleteAttributionRule,
  ensureOwner,
  nextRulePriority,
  setManualOwner,
} from "@tare/db/repositories";
import { resolveAttribution } from "@tare/ingest";
import { requireSession } from "../../lib/session";

const matcherSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("tag"), key: z.string().min(1).max(64), value: z.string().min(1).max(200) }),
  z.object({ type: z.literal("run_as_domain"), domain: z.string().min(1).max(200) }),
  z.object({ type: z.literal("run_as_equals"), email: z.string().email() }),
  z.object({ type: z.literal("creator"), user: z.string().min(1).max(200) }),
  z.object({ type: z.literal("warehouse_id"), id: z.string().min(1).max(200) }),
]);

const addRuleSchema = z.object({
  ownerName: z.string().min(1).max(80),
  ownerKind: z.enum(["team", "person"]),
  matcher: matcherSchema,
});

export async function addAttributionRuleAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSession();
  const parsed = addRuleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  await withTenant(session.activeTenant.id, async (ctx) => {
    const owner = await ensureOwner(ctx, parsed.data.ownerName, parsed.data.ownerKind);
    const priority = await nextRulePriority(ctx);
    await createAttributionRule(ctx, { priority, matcher: parsed.data.matcher, ownerId: owner.id });
    await resolveAttribution(ctx);
  });

  revalidatePath("/owners");
  revalidatePath("/overview");
  return { ok: true };
}

export async function deleteRuleAction(id: string): Promise<void> {
  const session = await requireSession();
  await withTenant(session.activeTenant.id, async (ctx) => {
    await deleteAttributionRule(ctx, id);
    await resolveAttribution(ctx);
  });
  revalidatePath("/owners");
}

const manualSchema = z.object({
  entityId: z.string().uuid(),
  ownerName: z.string().min(1).max(80),
  ownerKind: z.enum(["team", "person"]),
});

export async function assignManualOwnerAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSession();
  const parsed = manualSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  await withTenant(session.activeTenant.id, async (ctx) => {
    const owner = await ensureOwner(ctx, parsed.data.ownerName, parsed.data.ownerKind);
    await setManualOwner(ctx, parsed.data.entityId, owner.id);
  });
  revalidatePath("/owners");
  revalidatePath("/overview");
  revalidatePath("/ledger");
  revalidatePath("/workload/[name]", "page");
  return { ok: true };
}
