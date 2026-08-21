import { withTenant } from "@tare/db";
import {
  listBudgets,
  listInvitations,
  listMembers,
  listOwners,
  listRateCard,
} from "@tare/db/repositories";
import { AppShell } from "../../components/shell";
import { Money } from "../../components/money";
import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Card, CardBody, CardHeader, CardHint, CardTitle } from "../../components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
import { getRuntimeDistribution } from "../../lib/runtime-distribution";
import { listRecentIngestRuns } from "../../lib/ingest-history";
import { requireSession } from "../../lib/session";
import { InviteForm } from "./invite-form";
import { RemoveInviteButton, RemoveMemberButton } from "./row-actions";
import { BudgetSection } from "./budget-section";
import { RateCardPanel } from "./rate-card-panel";

const REVOKE = `REVOKE USE CATALOG ON CATALOG system FROM \`tare-service-principal\`;`;

export default async function SettingsPage() {
  const session = await requireSession();
  const [{ members, invitations, budgets, owners, rateCard }, runtimes, runs] = await Promise.all([
    withTenant(session.activeTenant.id, async (ctx) => ({
      members: await listMembers(ctx),
      invitations: await listInvitations(ctx),
      budgets: await listBudgets(ctx),
      owners: await listOwners(ctx),
      rateCard: await listRateCard(ctx),
    })),
    getRuntimeDistribution(session.activeTenant.id),
    listRecentIngestRuns(session.activeTenant.id, 15),
  ]);

  return (
    <AppShell active="settings" session={session}>
      <PageHeader title="Settings" description="Rates, budgets, residency, people." />

      <Card
        className={
          "mb-6 border-l-2 " +
          (rateCard.length === 0 ? "border-l-estimated" : "border-l-recovered")
        }
      >
        <CardHeader>
          <CardTitle>Rate card</CardTitle>
          {rateCard.length === 0 ? (
            <Badge variant="estimated">absent · list price in use</Badge>
          ) : (
            <Badge variant="recovered">
              {rateCard.length} row{rateCard.length === 1 ? "" : "s"} · billed
            </Badge>
          )}
        </CardHeader>
        <RateCardPanel entries={rateCard} currency={session.activeTenant.currency} />
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Budgets and thresholds</CardTitle>
          <CardHint>Currency: {session.activeTenant.currency}</CardHint>
        </CardHeader>
        <BudgetSection
          budgets={budgets.map((b) => ({
            id: b.id,
            scope: b.scope,
            scopeLabel: b.scopeLabel,
            period: b.period,
            limitMinor: b.limitMinor,
            thresholdPct: b.thresholdPct,
            currency: b.currency,
          }))}
          owners={owners.map((o) => ({ id: o.id, name: o.name }))}
          currency={session.activeTenant.currency}
        />
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>People</CardTitle>
        </CardHeader>
        <CardBody className="border-b border-rule">
          <InviteForm />
        </CardBody>
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Role</TH>
              <TH className="text-right" />
            </TR>
          </THead>
          <TBody>
            {members.map((m) => (
              <TR key={m.userId}>
                <TD>{m.name || <span className="text-muted">—</span>}</TD>
                <TD className="font-mono text-muted">{m.email}</TD>
                <TD className="capitalize">{m.role}</TD>
                <TD className="text-right">
                  {m.userId === session.user.id ? (
                    <span className="text-muted text-[12px]">you</span>
                  ) : m.role === "owner" ? (
                    <span className="text-muted text-[12px]">—</span>
                  ) : (
                    <RemoveMemberButton userId={m.userId} />
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      {invitations.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardHint>Expire 72 hours after sending</CardHint>
          </CardHeader>
          <Table>
            <THead>
              <TR>
                <TH>Email</TH>
                <TH>Role</TH>
                <TH>Expires</TH>
                <TH className="text-right" />
              </TR>
            </THead>
            <TBody>
              {invitations.map((inv) => (
                <TR key={inv.id}>
                  <TD className="font-mono">{inv.email}</TD>
                  <TD className="capitalize">{inv.role}</TD>
                  <TD className="font-mono text-muted">{formatDate(inv.expiresAt)}</TD>
                  <TD className="text-right"><RemoveInviteButton id={inv.id} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Runtime distribution</CardTitle>
          <CardHint>Latest snapshot per entity · cost = 30-day window</CardHint>
        </CardHeader>
        {runtimes.length === 0 ? (
          <CardBody className="text-muted">No cluster snapshots yet.</CardBody>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Runtime</TH>
                <TH className="text-right">Entities</TH>
                <TH className="text-right">Cost, 30d</TH>
                <TH className="text-right">Share</TH>
              </TR>
            </THead>
            <TBody>
              {runtimes.map((r, i) => (
                <TR key={r.runtimeVersion ?? `none-${i}`}>
                  <TD className="font-mono">
                    {r.runtimeVersion ?? <span className="text-muted">—</span>}
                    {r.runtimeVersion && isDeprecated(r.runtimeVersion) && (
                      <Badge variant="overrun" className="ml-2">deprecated</Badge>
                    )}
                  </TD>
                  <TD className="text-right font-mono tabular-nums">{r.entities}</TD>
                  <TD className="text-right">
                    <Money amount={r.costMinor} basis="billed" currency={session.activeTenant.currency as "EUR" | "USD"} />
                  </TD>
                  <TD className="text-right font-mono tabular-nums">{r.pct.toFixed(1)}%</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ingestion runs</CardTitle>
          <CardHint>Last 15 · latest first</CardHint>
        </CardHeader>
        {runs.length === 0 ? (
          <CardBody className="text-muted">No runs yet. Trigger one from the Connection page.</CardBody>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Started</TH>
                <TH>Source</TH>
                <TH>Window</TH>
                <TH>Status</TH>
                <TH className="text-right">Rows</TH>
                <TH className="text-right">Duration</TH>
              </TR>
            </THead>
            <TBody>
              {runs.map((r) => (
                <TR key={r.id}>
                  <TD className="font-mono text-muted">
                    {r.startedAt
                      ? new Date(r.startedAt).toISOString().slice(0, 16).replace("T", " ")
                      : "—"}
                  </TD>
                  <TD className="font-mono">{r.source}</TD>
                  <TD className="font-mono text-muted">{r.windowStart} → {r.windowEnd}</TD>
                  <TD>
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    {r.attempts > 1 && <span className="ml-2 text-muted text-[12px]">({r.attempts} attempts)</span>}
                  </TD>
                  <TD className="text-right font-mono tabular-nums">{r.rowsUpserted.toLocaleString("en-IE")}</TD>
                  <TD className="text-right font-mono tabular-nums">{formatDuration(r.durationMs)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card className="border-l-2 border-l-overrun">
        <CardHeader>
          <CardTitle>End access</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-muted max-w-[72ch] mb-3">
            One statement in your workspace ends all access immediately. Tare keeps the aggregates already
            ingested until you delete the tenant.
          </p>
          <pre className="font-mono text-[12.5px] bg-ink text-[#C6CEDA] px-5 py-4 m-0 overflow-x-auto whitespace-pre">
            {REVOKE}
          </pre>
        </CardBody>
      </Card>
    </AppShell>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}Z`;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s - m * 60);
  return `${m}m ${rem}s`;
}

function statusVariant(status: string): "recovered" | "muted" | "overrun" | "threshold" {
  switch (status) {
    case "succeeded": return "recovered";
    case "queued":    return "muted";
    case "running":   return "muted";
    case "partial":   return "threshold";
    case "failed":    return "overrun";
    default:          return "muted";
  }
}

// DBR majors <13 are out of active support (matches dbr_upgrade rule).
function isDeprecated(runtimeVersion: string): boolean {
  const m = /^(\d+)/.exec(runtimeVersion);
  return m ? Number(m[1]) < 13 : false;
}
