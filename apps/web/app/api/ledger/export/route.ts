import { NextResponse } from "next/server";
import { withTenant } from "@tare/db";
import type { Basis, EntityKind } from "@tare/core";
import { requireSession } from "../../../../lib/session";

const MAX_ROWS = 500_000;

export async function GET(req: Request): Promise<Response> {
  const session = await requireSession();
  const url = new URL(req.url);
  const days = Math.min(730, Math.max(1, Number(url.searchParams.get("days") ?? "30")));
  const owner = url.searchParams.get("owner") ?? "";
  const kind = (url.searchParams.get("kind") ?? "") as EntityKind | "";
  const basis = (url.searchParams.get("basis") ?? "") as Basis | "";

  const rows = await withTenant(session.activeTenant.id, async (ctx) => {
    const params: unknown[] = [ctx.tenantId, days];
    const where: string[] = [
      "u.tenant_id = $1",
      `u.usage_date >= (CURRENT_DATE - ($2 || ' days')::interval)`,
    ];
    if (owner === "unattr") where.push("eo.owner_id IS NULL");
    else if (owner) { params.push(owner); where.push(`eo.owner_id = $${params.length}`); }
    if (kind)  { params.push(kind);  where.push(`e.kind = $${params.length}::entity_kind`); }
    if (basis) { params.push(basis); where.push(`u.cost_basis = $${params.length}::basis`); }
    params.push(MAX_ROWS);

    const res = await ctx.query<{
      usage_date: string;
      entity: string;
      kind: string;
      external_id: string;
      sku: string;
      owner_name: string | null;
      dbus: number;
      cost_minor: number;
      cost_basis: Basis;
      currency: string;
    }>(
      `SELECT u.usage_date::text AS usage_date,
              e.name AS entity, e.kind::text AS kind, e.external_id,
              u.sku,
              o.name AS owner_name,
              u.dbus::float8 AS dbus,
              u.cost_minor::bigint AS cost_minor,
              u.cost_basis, u.currency
       FROM usage_daily u
       JOIN entity e ON e.id = u.entity_id
       LEFT JOIN entity_owner eo ON eo.tenant_id = u.tenant_id AND eo.entity_id = u.entity_id
       LEFT JOIN owner o ON o.id = eo.owner_id
       WHERE ${where.join(" AND ")}
       ORDER BY u.usage_date DESC, u.cost_minor DESC
       LIMIT $${params.length}`,
      params,
    );
    return res.rows;
  });

  const header = [
    "usage_date",
    "entity",
    "kind",
    "external_id",
    "sku",
    "owner",
    "dbus",
    "cost",
    "cost_basis",
    "currency",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.usage_date,
        csvField(r.entity),
        r.kind,
        csvField(r.external_id),
        csvField(r.sku),
        csvField(r.owner_name ?? ""),
        Number(r.dbus).toFixed(4),
        (Number(r.cost_minor) / 100).toFixed(2),
        r.cost_basis,
        r.currency,
      ].join(","),
    );
  }
  const body = lines.join("\n") + "\n";

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tare-ledger-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvField(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
