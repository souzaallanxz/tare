"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { createAssessmentLead } from "@tare/db/repositories";

const schema = z.object({
  email: z.string().email().max(254),
  company: z.string().max(160).optional(),
  workspaceHost: z.string().max(200).optional(),
  spendBand: z.enum(["<15k", "15-40k", "40-100k", "100k+"]).optional(),
  notes: z.string().max(2000).optional(),
});

const HOSTED_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
]);

export async function submitAssessmentAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    company: (formData.get("company") as string) || undefined,
    workspaceHost: (formData.get("workspaceHost") as string) || undefined,
    spendBand: (formData.get("spendBand") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Reject the obvious junk without pretending to enumerate users.
  const domain = parsed.data.email.split("@")[1]?.toLowerCase() ?? "";
  if (HOSTED_DOMAINS.has(domain)) {
    return { ok: false, error: "Please use your work email." };
  }

  const h = await headers();
  const forwarded = h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? null;
  const ip = forwarded?.split(",")[0]?.trim() ?? null;
  const ua = h.get("user-agent") ?? "";
  const uaHash = ua ? createHash("sha256").update(ua).digest("hex").slice(0, 32) : null;

  await createAssessmentLead({
    email: parsed.data.email,
    company: parsed.data.company ?? null,
    workspaceHost: parsed.data.workspaceHost ?? null,
    spendBand: parsed.data.spendBand ?? null,
    notes: parsed.data.notes ?? null,
    source: "assessment_form",
    ipAddress: ip,
    userAgentHash: uaHash,
  });

  // Logging the lead lets the founder see it even before an email provider
  // is wired for the founder-facing notification.
  console.log(`[lead] assessment request from ${parsed.data.email}`);
  return { ok: true };
}
