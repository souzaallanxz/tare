"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withTenant } from "@tare/db";
import {
  getConnection,
  loadSealedSecret,
  updateConnectionStatus,
  upsertConnection,
} from "@tare/db/repositories";
import { deserialize, envKekProvider, open, seal, serialize } from "@tare/crypto";
import {
  databricksSource,
  fakeSource,
  runIngestion,
  classify,
  recomputeRollups,
} from "@tare/ingest";
import { addDays, toIsoDate } from "@tare/core";
import { requireSession } from "../../lib/session";

const HOST_RE = /^[a-z0-9.-]+\.(azuredatabricks|databricks|databricks-dev)\.(net|com)$/i;

const connectSchema = z.object({
  host: z.string().min(1).regex(HOST_RE, "Expected a Databricks workspace host"),
  clientId: z.string().uuid("Client ID must be a UUID"),
  clientSecret: z.string().min(8),
  warehouseId: z.string().min(1).nullable().optional(),
});

export async function saveConnectionAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSession();
  const parsed = connectSchema.safeParse({
    host: formData.get("host"),
    clientId: formData.get("clientId"),
    clientSecret: formData.get("clientSecret"),
    warehouseId: formData.get("warehouseId") || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const kek = envKekProvider();
  const sealed = seal(parsed.data.clientSecret, kek);
  const sealedBytes = Buffer.from(serialize(sealed), "utf8");

  await withTenant(session.activeTenant.id, (ctx) =>
    upsertConnection(ctx, {
      host: parsed.data.host,
      clientId: parsed.data.clientId,
      warehouseId: parsed.data.warehouseId ?? null,
      sealedBytes,
      kekVersion: sealed.kekVersion,
    }),
  );

  revalidatePath("/connect");
  return { ok: true };
}

/**
 * Try the OAuth token endpoint. Updates the connection status with a
 * classified error message so the UI can render the exact grant that is
 * missing rather than "Ingestion failed".
 */
export async function testConnectionAction(): Promise<{ ok: boolean; message: string }> {
  const session = await requireSession();
  const outcome = await withTenant(session.activeTenant.id, async (ctx) => {
    const conn = await getConnection(ctx);
    if (!conn) return { status: "error" as const, message: "No connection saved yet." };
    const secretRow = await loadSealedSecret(ctx, conn.id);
    if (!secretRow) return { status: "error" as const, message: "Sealed secret is missing." };

    let clientSecret: string;
    try {
      const sealed = deserialize(secretRow.sealed.toString("utf8"));
      clientSecret = open(sealed, envKekProvider());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await updateConnectionStatus(ctx, conn.id, "error", `Cannot decrypt secret: ${msg}`);
      return { status: "error" as const, message: msg };
    }

    try {
      const body = new URLSearchParams({ grant_type: "client_credentials", scope: "all-apis" });
      const auth = Buffer.from(`${conn.clientId}:${clientSecret}`).toString("base64");
      const res = await fetch(`https://${conn.host}/oidc/v1/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Token endpoint returned ${res.status}: ${detail.slice(0, 200)}`);
      }
      await updateConnectionStatus(ctx, conn.id, "ok", null);
      return { status: "ok" as const, message: "Connection verified." };
    } catch (err) {
      const cls = classify(err);
      const bucket =
        cls.class === "authentication" ? "auth_failed"
        : cls.class === "permission"   ? "permission"
        : cls.class === "quota"        ? "quota"
        : "error";
      await updateConnectionStatus(ctx, conn.id, bucket, cls.hint ?? cls.message);
      return { status: bucket, message: cls.hint ?? cls.message };
    }
  });

  revalidatePath("/connect");
  revalidatePath("/overview");
  return { ok: outcome.status === "ok", message: outcome.message };
}

/**
 * Kick a real ingestion. If USE_FAKE_INGEST=1 or no valid connection, uses
 * the fake source so localhost development works without a Databricks
 * workspace. In production without the env var, only runs against a real
 * "ok" connection.
 */
export async function startIngestionAction(
  windowDays = 30,
): Promise<{ ok: boolean; message: string; runId?: string; rows?: number }> {
  const session = await requireSession();
  const useFake = process.env["USE_FAKE_INGEST"] === "1";
  const end = toIsoDate(new Date());
  const start = addDays(end, -windowDays);

  const result = await withTenant(session.activeTenant.id, async (ctx) => {
    const conn = await getConnection(ctx);

    const source = useFake || !conn || conn.status !== "ok"
      ? fakeSource({ currency: "EUR" })
      : await buildDatabricksSource(ctx, conn);

    try {
      const stats = await runIngestion(ctx, source, conn?.id ?? null, { from: start, to: end });
      await recomputeRollups(ctx, start, end);
      return { ok: true as const, message: `Ingested ${stats.rowsUpserted} rows.`, rows: stats.rowsUpserted };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false as const, message: msg };
    }
  });

  revalidatePath("/overview");
  revalidatePath("/ledger");
  revalidatePath("/connect");
  return result;
}

async function buildDatabricksSource(
  ctx: import("@tare/db").TenantContext,
  conn: NonNullable<Awaited<ReturnType<typeof getConnection>>>,
) {
  const secretRow = await loadSealedSecret(ctx, conn.id);
  if (!secretRow) throw new Error("Sealed secret missing at ingestion time");
  const clientSecret = open(deserialize(secretRow.sealed.toString("utf8")), envKekProvider());
  return databricksSource({
    host: conn.host,
    clientId: conn.clientId,
    clientSecret,
    warehouseId: conn.warehouseId ?? "",
    currency: "EUR",
  });
}
