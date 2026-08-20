import Link from "next/link";
import { withTenant } from "@tare/db";
import { listOwners, type Owner } from "@tare/db/repositories";
import { AppShell } from "../../components/shell";
import { LedgerTable, type LedgerRow } from "../../components/ledger-table";
import { requireSession } from "../../lib/session";
import type { Basis, EntityKind } from "@tare/core";

const PAGE_SIZE = 50;

type Search = Record<string, string | string[] | undefined>;

export default async function LedgerPage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await requireSession();
  const sp = await searchParams;
  const ownerFilter = str(sp["owner"]);          // owner id, "unattr", or ""
  const kindFilter = str(sp["kind"]) as EntityKind | "";
  const basisFilter = (str(sp["basis"]) || "") as Basis | "";
  const days = Math.min(90, Math.max(1, Number(str(sp["days"]) || "14")));
  const page = Math.max(0, Number(str(sp["page"]) || "0"));

  const { rows, total, owners } = await withTenant(session.activeTenant.id, async (ctx) => {
    const owners = await listOwners(ctx);
    const params: unknown[] = [ctx.tenantId, days];
    const where: string[] = [
      "u.tenant_id = $1",
      `u.usage_date >= (CURRENT_DATE - ($2 || ' days')::interval)`,
    ];
    if (ownerFilter === "unattr") {
      where.push("eo.owner_id IS NULL");
    } else if (ownerFilter) {
      params.push(ownerFilter);
      where.push(`eo.owner_id = $${params.length}`);
    }
    if (kindFilter) {
      params.push(kindFilter);
      where.push(`e.kind = $${params.length}::entity_kind`);
    }
    if (basisFilter) {
      params.push(basisFilter);
      where.push(`u.cost_basis = $${params.length}::basis`);
    }

    const totalRes = await ctx.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n
       FROM usage_daily u
       JOIN entity e ON e.id = u.entity_id
       LEFT JOIN entity_owner eo ON eo.tenant_id = u.tenant_id AND eo.entity_id = u.entity_id
       WHERE ${where.join(" AND ")}`,
      params,
    );

    params.push(PAGE_SIZE, page * PAGE_SIZE);
    const rowsRes = await ctx.query<LedgerRowServer>(
      `SELECT u.usage_date, e.name AS entity, e.kind::text AS kind, u.sku,
              u.dbus, u.cost_minor, u.cost_basis, u.currency, u.entity_id,
              o.name AS owner_name
       FROM usage_daily u
       JOIN entity e ON e.id = u.entity_id
       LEFT JOIN entity_owner eo ON eo.tenant_id = u.tenant_id AND eo.entity_id = u.entity_id
       LEFT JOIN owner o ON o.id = eo.owner_id
       WHERE ${where.join(" AND ")}
       ORDER BY u.usage_date DESC, u.cost_minor DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { rows: rowsRes.rows, total: totalRes.rows[0]!.n, owners };
  });

  return (
    <AppShell active="ledger" session={session}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 className="display">Ledger</h1>
          <p className="mut" style={{ margin: "6px 0 0" }}>
            {total.toLocaleString("en-IE")} rows in the last {days} days.
          </p>
        </div>
      </div>

      <section className="panel">
        <header>
          <FilterForm
            owners={owners}
            values={{ owner: ownerFilter, kind: kindFilter, basis: basisFilter, days: String(days) }}
          />
        </header>

        <LedgerTable rows={rowsForClient(rows)} />
        {rows.length > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={total} search={sp} />}
      </section>
    </AppShell>
  );
}

// ─── helpers ────────────────────────────────────────────────

function str(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

function rowsForClient(rows: readonly LedgerRowServer[]): LedgerRow[] {
  return rows.map((r, i) => ({
    id: `${r.entity_id}-${r.usage_date}-${r.sku}-${i}`,
    usageDate: r.usage_date,
    entity: r.entity,
    kind: r.kind,
    sku: r.sku,
    dbus: Number(r.dbus),
    costMinor: Number(r.cost_minor),
    costBasis: r.cost_basis,
    currency: r.currency as "EUR" | "USD",
    ownerName: r.owner_name,
  }));
}

type LedgerRowServer = {
  usage_date: string;
  entity: string;
  kind: string;
  sku: string;
  dbus: number;
  cost_minor: number;
  cost_basis: Basis;
  currency: string;
  entity_id: string;
  owner_name: string | null;
};

function FilterForm({
  owners,
  values,
}: {
  owners: Owner[];
  values: { owner: string; kind: string; basis: string; days: string };
}) {
  return (
    <form action="/ledger" method="GET" style={{ display: "flex", gap: 8, flexWrap: "wrap", width: "100%" }}>
      <select name="owner" defaultValue={values.owner} style={selectStyle}>
        <option value="">Owner: all</option>
        <option value="unattr">Unattributed</option>
        {owners.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
      <select name="kind" defaultValue={values.kind} style={selectStyle}>
        <option value="">Kind: all</option>
        <option value="job">job</option>
        <option value="cluster">cluster</option>
        <option value="warehouse">warehouse</option>
        <option value="pipeline">pipeline</option>
        <option value="notebook">notebook</option>
      </select>
      <select name="basis" defaultValue={values.basis} style={selectStyle}>
        <option value="">Basis: all</option>
        <option value="billed">billed</option>
        <option value="estimated">estimated</option>
      </select>
      <select name="days" defaultValue={values.days} style={selectStyle}>
        <option value="7">Last 7 days</option>
        <option value="14">Last 14 days</option>
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
      </select>
      <button className="btn ghost s" type="submit">Apply</button>
    </form>
  );
}

function Pagination({
  page,
  pageSize,
  total,
  search,
}: {
  page: number;
  pageSize: number;
  total: number;
  search: Search;
}) {
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  const qp = new URLSearchParams();
  for (const [k, v] of Object.entries(search)) {
    if (typeof v === "string" && k !== "page") qp.set(k, v);
  }
  const link = (p: number) => {
    qp.set("page", String(p));
    return `/ledger?${qp.toString()}`;
  };
  return (
    <div
      className="pad"
      style={{ borderTop: "1px solid var(--color-rule)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}
    >
      <span className="mut" style={{ fontSize: 13 }}>
        Showing {page * pageSize + 1}–{Math.min(total, (page + 1) * pageSize)} of {total}
      </span>
      <span style={{ display: "flex", gap: 8 }}>
        {page > 0 && <Link className="btn ghost s" href={link(page - 1) as never}>← Previous</Link>}
        {page < lastPage && <Link className="btn ghost s" href={link(page + 1) as never}>Next →</Link>}
      </span>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "6px 10px",
  border: "1px solid var(--color-rule)",
  background: "var(--color-surface)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--color-ink)",
};
