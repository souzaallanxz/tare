"use server";

import { randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withTenant } from "@tare/db";
import { createInvitation, revokeInvitation, removeMember } from "@tare/db/repositories";
import { requireSession } from "../../lib/session";

const inviteSchema = z.object({
  email: z.string().email().max(254),
  role: z.enum(["owner", "member"]),
});

export async function inviteMemberAction(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await requireSession();
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role") ?? "member",
  });
  if (!parsed.success) return { ok: false, error: "Invalid email address." };

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const id = await withTenant(session.activeTenant.id, async (ctx) =>
    createInvitation(ctx, {
      email: parsed.data.email,
      role: parsed.data.role,
      tokenHash,
      invitedBy: session.user.id,
    }),
  );

  const base = process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000";
  const url = `${base}/invite/${id}?token=${token}`;

  // Provider lands in phase 1d; for now the URL is logged and returned to the caller.
  console.log(`[invite] ${parsed.data.email} → ${url}`);
  revalidatePath("/settings");
  return { ok: true, url };
}

export async function revokeInvitationAction(invitationId: string): Promise<void> {
  const session = await requireSession();
  await withTenant(session.activeTenant.id, (ctx) => revokeInvitation(ctx, invitationId));
  revalidatePath("/settings");
}

export async function removeMemberAction(userId: string): Promise<void> {
  const session = await requireSession();
  if (userId === session.user.id) {
    throw new Error("Owners cannot remove themselves from settings.");
  }
  await withTenant(session.activeTenant.id, (ctx) => removeMember(ctx, userId));
  revalidatePath("/settings");
}
