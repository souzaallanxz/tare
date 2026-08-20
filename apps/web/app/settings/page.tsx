import { withTenant } from "@tare/db";
import {
  listBudgets,
  listInvitations,
  listMembers,
  listOwners,
  listRateCard,
} from "@tare/db/repositories";
import { AppShell } from "../../components/shell";
import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Card, CardBody, CardHeader, CardHint, CardTitle } from "../../components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
import { requireSession } from "../../lib/session";
import { InviteForm } from "./invite-form";
import { RemoveInviteButton, RemoveMemberButton } from "./row-actions";
import { BudgetSection } from "./budget-section";
import { RateCardPanel } from "./rate-card-panel";

const REVOKE = `REVOKE USE CATALOG ON CATALOG system FROM \`tare-service-principal\`;`;

export default async function SettingsPage() {
  const session = await requireSession();
  const { members, invitations, budgets, owners, rateCard } = await withTenant(session.activeTenant.id, async (ctx) => ({
    members: await listMembers(ctx),
    invitations: await listInvitations(ctx),
    budgets: await listBudgets(ctx),
    owners: await listOwners(ctx),
    rateCard: await listRateCard(ctx),
  }));

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
