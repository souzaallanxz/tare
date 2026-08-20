import Link from "next/link";
import { withTenant } from "@tare/db";
import { Lockup } from "./logo";
import { Pill } from "./pills";
import { SignOut } from "./sign-out";
import { FIXTURE } from "../lib/fixtures";
import type { ActiveSession } from "../lib/session";

const NAV = [
  { href: "/overview", label: "Overview", key: "overview" },
  { href: "/ledger",   label: "Ledger",   key: "ledger" },
  { href: "/owners",   label: "Owners",   key: "owners" },
  { href: "/savings",  label: "Savings",  key: "savings" },
  { href: "/report",   label: "Weekly report", key: "report" },
  { href: "/connect",  label: "Connection",    key: "connect" },
  { href: "/settings", label: "Settings",      key: "settings" },
] as const;

type Props = {
  active: string;
  session: ActiveSession;
  children: React.ReactNode;
};

export async function AppShell({ active, session, children }: Props) {
  const { user, activeTenant } = session;
  const freshness = await getFreshness(activeTenant.id);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "222px 1fr", minHeight: "100vh" }}>
      <aside
        style={{
          background: "var(--color-ink)",
          color: "#9AA6B8",
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "20px 18px" }}>
          <Link href="/"><Lockup variant="dark" /></Link>
        </div>
        <nav style={{ padding: "6px 10px", flex: 1 }}>
          {NAV.map((n) => {
            const on = active === n.key;
            return (
              <Link
                key={n.href}
                href={n.href as never}
                aria-current={on ? "page" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  fontSize: 14,
                  color: on ? "#fff" : "#9AA6B8",
                  background: on ? "rgba(255,255,255,.11)" : "transparent",
                  textDecoration: "none",
                }}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,.12)", fontSize: 13 }}>
          <div style={{ color: "#fff" }}>{user.name || user.email}</div>
          <div style={{ fontSize: 12 }}>{activeTenant.name} · owner</div>
          <div style={{ marginTop: 10 }}><SignOut /></div>
        </div>
      </aside>
      <main style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "13px 26px",
            borderBottom: "1px solid var(--color-rule)",
            background: "var(--color-surface)",
            position: "sticky",
            top: 0,
            zIndex: 5,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="sel">workspace: {FIXTURE.workspace} ⌄</button>
            <button className="sel">{FIXTURE.period} ⌄</button>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Pill variant="ink">billed</Pill>
            <Pill variant="est">estimated</Pill>
            <span style={{ color: "var(--color-muted)", fontSize: 13 }}>
              {freshness}
            </span>
          </div>
        </div>
        {freshness.startsWith("Fixture") ? (
          <div
            style={{
              padding: "7px 26px",
              borderBottom: "1px solid var(--color-rule)",
              background: "rgba(122,108,168,.09)",
              color: "var(--color-estimated)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: ".12em",
            }}
          >
            Fixture data · no workspace has ingested yet
          </div>
        ) : null}
        <div style={{ padding: 26 }}>{children}</div>
      </main>
    </div>
  );
}

async function getFreshness(tenantId: string): Promise<string> {
  return withTenant(tenantId, async (ctx) => {
    const res = await ctx.query<{ finished_at: Date | null; status: string }>(
      `SELECT finished_at, status::text AS status
       FROM ingest_run
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [ctx.tenantId],
    );
    const row = res.rows[0];
    if (!row) return `Fixture data · ingested ${FIXTURE.ingestedAt}`;
    if (row.status !== "succeeded") return `Ingestion ${row.status}`;
    const at = row.finished_at ?? new Date();
    return `Ingested ${at.toISOString().slice(0, 16).replace("T", " ")} UTC`;
  });
}

