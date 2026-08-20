"use server";

import { revalidatePath } from "next/cache";
import { withTenant } from "@tare/db";
import { transitionRecommendation } from "@tare/db/repositories";
import { sweepVerifications } from "@tare/ingest";
import { requireSession } from "../../lib/session";
import type { RecommendationState } from "@tare/core";

export async function transitionAction(
  id: string,
  to: RecommendationState,
  note: string | null = null,
): Promise<void> {
  const session = await requireSession();
  await withTenant(session.activeTenant.id, (ctx) =>
    transitionRecommendation(ctx, id, to, session.user.email, note),
  );
  revalidatePath("/savings");
  revalidatePath("/overview");
}

export async function runVerificationSweepAction(): Promise<{
  checked: number;
  confirmed: number;
  notObserved: number;
}> {
  const session = await requireSession();
  const out = await withTenant(session.activeTenant.id, (ctx) => sweepVerifications(ctx));
  revalidatePath("/savings");
  revalidatePath("/overview");
  return out;
}
