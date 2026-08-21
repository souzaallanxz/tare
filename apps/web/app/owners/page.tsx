import Link from "next/link";
import { withTenant } from "@tare/db";
import {
  listAttributionRules,
  ownerSpendBetween,
  type Matcher,
} from "@tare/db/repositories";
import { AppShell } from "../../components/shell";
import { Money } from "../../components/money";
import { OwnerTrendChart } from "../../components/owner-trend-chart";
import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Card, CardBody, CardHeader, CardHint, CardTitle } from "../../components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
import { getOwnerTrend } from "../../lib/owner-trend";
import { requireSession } from "../../lib/session";
import { AddRuleForm } from "./add-rule-form";
import { DeleteRuleButton } from "./delete-rule-button";

export default async function OwnersPage() {
  const session = await requireSession();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);

  const [{ spends, rules }, trend] = await Promise.all([
    withTenant(session.activeTenant.id, async (ctx) => ({
      spends: await ownerSpendBetween(ctx, monthStart, monthEnd),
      rules: await listAttributionRules(ctx),
    })),
    getOwnerTrend(session.activeTenant.id),
  ]);

  const totalMinor = spends.reduce((s, o) => s + o.spendMinor, 0);
  const unattr = spends.find((o) => o.ownerId === null);

  return (
    <AppShell active="owners" session={session}>
      <PageHeader
        title="Owners"
        description="Attribution resolves in priority order. Whatever no rule matches stays on screen."
      />

      {spends.length === 0 ? (
        <Card>
          <CardBody className="text-muted">
            No usage data yet — run an ingestion from the Connection page.
          </CardBody>
        </Card>
      ) : (
        <>
          {unattr && (
            <Card className="border-l-2 border-l-overrun mb-6">
              <CardBody>
                <div className="flex flex-wrap items-center justify-between gap-5">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[.12em] text-muted">
                      Unattributed spend
                    </div>
                    <div className="font-mono font-medium text-[26px] mt-1.5 tabular-nums">
                      {totalMinor > 0 ? ((unattr.spendMinor / totalMinor) * 100).toFixed(1) : "0.0"}% ·{" "}
                      <Money amount={unattr.spendMinor} basis="billed" />
                    </div>
                    <p className="text-muted text-[13px] mt-2 max-w-[62ch]">
                      Entities with no matching attribution rule. Add rules below to close this share.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Spend by owner</CardTitle>
              <CardHint>Month to date</CardHint>
            </CardHeader>
            <Table>
              <THead>
                <TR>
                  <TH>Owner</TH>
                  <TH className="text-right">Entities</TH>
                  <TH className="text-right">Spend</TH>
                  <TH className="text-right">Share</TH>
                </TR>
              </THead>
              <TBody>
                {spends.map((o) => (
                  <TR key={o.ownerId ?? "unattr"}>
                    <TD>
                      <Link
                        href={`/owners/${o.ownerId ?? "unattr"}` as never}
                        className={o.ownerId === null ? "font-medium text-overrun hover:underline" : "font-medium hover:underline"}
                      >
                        {o.name}
                      </Link>
                    </TD>
                    <TD className="text-right font-mono tabular-nums">{o.entities}</TD>
                    <TD className="text-right"><Money amount={o.spendMinor} basis="billed" /></TD>
                    <TD className="text-right font-mono tabular-nums">
                      {totalMinor > 0 ? ((o.spendMinor / totalMinor) * 100).toFixed(1) : "0.0"}%
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Daily stack, 30 days</CardTitle>
              <CardHint>Top 5 owners + Other</CardHint>
            </CardHeader>
            <CardBody>
              <OwnerTrendChart
                days={trend.days}
                ownerNames={trend.ownerNames}
                currency={trend.currency}
              />
            </CardBody>
          </Card>
        </>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Attribution rules</CardTitle>
          <CardHint>First match wins</CardHint>
        </CardHeader>
        <CardBody className="border-b border-rule">
          <AddRuleForm />
        </CardBody>
        {rules.length === 0 ? (
          <CardBody className="text-muted">
            No rules yet. Everything shows as unattributed until you add one.
          </CardBody>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Priority</TH>
                <TH>Matcher</TH>
                <TH>Owner</TH>
                <TH className="text-right" />
              </TR>
            </THead>
            <TBody>
              {rules.map((r) => (
                <TR key={r.id}>
                  <TD className="font-mono text-muted">{r.priority}</TD>
                  <TD className="font-mono">{describeMatcher(r.matcher)}</TD>
                  <TD>{r.ownerName}</TD>
                  <TD className="text-right"><DeleteRuleButton id={r.id} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reminder</CardTitle>
          <Badge variant="estimated">estimated</Badge>
        </CardHeader>
        <CardBody className="text-muted text-[14px]">
          The unattributed share is a metric, not a saving. Never rolled into confirmed savings.
        </CardBody>
      </Card>
    </AppShell>
  );
}

function describeMatcher(m: Matcher): string {
  switch (m.type) {
    case "tag":            return `tag ${m.key} = ${m.value}`;
    case "run_as_domain":  return `run_as ends with @${m.domain}`;
    case "run_as_equals":  return `run_as = ${m.email}`;
    case "creator":        return `creator = ${m.user}`;
    case "warehouse_id":   return `warehouse_id = ${m.id}`;
  }
}
