import Link from "next/link";
import { withTenant } from "@tare/db";
import { Lockup } from "./logo";
import { Badge } from "./ui/badge";
import { SignOut } from "./sign-out";
import { FIXTURE } from "../lib/fixtures";
import { cn } from "../lib/cn";
import type { ActiveSession } from "../lib/session";

const NAV = [
  { href: "/overview", label: "Overview",        key: "overview" },
  { href: "/ledger",   label: "Ledger",          key: "ledger" },
  { href: "/owners",   label: "Owners",          key: "owners" },
  { href: "/savings",  label: "Savings",         key: "savings" },
  { href: "/report",   label: "Weekly report",   key: "report" },
  { href: "/connect",  label: "Connection",      key: "connect" },
  { href: "/settings", label: "Settings",        key: "settings" },
] as const;

type Props = {
  active: string;
  session: ActiveSession;
  children: React.ReactNode;
};

export async function AppShell({ active, session, children }: Props) {
  const { user, activeTenant } = session;
  const freshness = await getFreshness(activeTenant.id);
  const isFixture = freshness.startsWith("Fixture");
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[222px_1fr] min-h-screen">
      <aside className="bg-ink text-[#9AA6B8] lg:sticky lg:top-0 lg:h-screen flex flex-col">
        <div className="p-5">
          <Link href="/"><Lockup variant="dark" /></Link>
        </div>
        <nav className="px-2.5 py-1.5 flex-1">
          {NAV.map((n) => {
            const on = active === n.key;
            return (
              <Link
                key={n.href}
                href={n.href as never}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 text-sm no-underline",
                  on ? "text-white bg-white/10" : "text-[#9AA6B8] hover:text-white",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-3.5 border-t border-white/10 text-[13px]">
          <div className="text-white">{user.name || user.email}</div>
          <div className="text-[12px]">{activeTenant.name} · owner</div>
          <div className="mt-2.5"><SignOut /></div>
        </div>
      </aside>

      <main className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-b border-rule bg-surface sticky top-0 z-10">
          <div className="flex flex-wrap gap-2.5">
            <button className="inline-flex items-center gap-2 px-2.5 h-8 border border-rule bg-surface text-ink font-mono text-[12px] hover:border-ink">
              workspace: {FIXTURE.workspace} ⌄
            </button>
            <button className="inline-flex items-center gap-2 px-2.5 h-8 border border-rule bg-surface text-ink font-mono text-[12px] hover:border-ink">
              {FIXTURE.period} ⌄
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="ink">billed</Badge>
            <Badge variant="estimated">estimated</Badge>
            <span className="text-muted text-[13px]">{freshness}</span>
          </div>
        </div>

        {isFixture ? (
          <div className="px-6 py-1.5 border-b border-rule bg-estimated/10 text-estimated font-mono text-[11px] uppercase tracking-[.12em]">
            Fixture data · no workspace has ingested yet
          </div>
        ) : null}

        <div className="p-6">{children}</div>
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
