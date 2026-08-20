import { withTenant } from "@tare/db";
import {
  listAttributionRules,
  ownerSpendBetween,
  type Matcher,
} from "@tare/db/repositories";
import { AppShell } from "../../components/shell";
import { Money } from "../../components/money";
import { Pill } from "../../components/pills";
import { requireSession } from "../../lib/session";
import { AddRuleForm } from "./add-rule-form";
import { DeleteRuleButton } from "./delete-rule-button";

export default async function OwnersPage() {
  const session = await requireSession();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);

  const { spends, rules } = await withTenant(session.activeTenant.id, async (ctx) => ({
    spends: await ownerSpendBetween(ctx, monthStart, monthEnd),
    rules: await listAttributionRules(ctx),
  }));

  const totalMinor = spends.reduce((s, o) => s + o.spendMinor, 0);
  const unattr = spends.find((o) => o.ownerId === null);

  return (
    <AppShell active="owners" session={session}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 className="display">Owners</h1>
          <p className="mut" style={{ margin: "6px 0 0" }}>
            Attribution resolves in priority order. Whatever no rule matches stays on screen.
          </p>
        </div>
      </div>

      {spends.length === 0 ? (
        <section className="panel">
          <div className="pad mut">No usage data yet — run an ingestion from the Connection page.</div>
        </section>
      ) : (
        <>
          {unattr && (
            <section className="panel" style={{ borderLeft: "2px solid var(--color-overrun)" }}>
              <div className="pad" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <div>
                  <span className="label">Unattributed spend</span>
                  <div style={{ fontSize: 26, fontFamily: "var(--font-mono)", fontWeight: 500, marginTop: 6 }}>
                    {totalMinor > 0 ? ((unattr.spendMinor / totalMinor) * 100).toFixed(1) : "0.0"}% ·{" "}
                    <Money amount={unattr.spendMinor} basis="billed" />
                  </div>
                  <p className="mut" style={{ fontSize: 13, margin: "8px 0 0", maxWidth: "62ch" }}>
                    Entities with no matching attribution rule. Add rules below to close this share.
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="panel">
            <header><span className="title">Spend by owner</span><span className="label">Month to date</span></header>
            <table>
              <thead>
                <tr>
                  <th>Owner</th><th className="n">Entities</th>
                  <th className="n">Spend</th><th className="n">Share</th>
                </tr>
              </thead>
              <tbody>
                {spends.map((o) => (
                  <tr key={o.ownerId ?? "unattr"}>
                    <td>
                      <span style={{ fontWeight: 500, color: o.ownerId === null ? "var(--color-overrun)" : undefined }}>
                        {o.name}
                      </span>
                    </td>
                    <td className="n data">{o.entities}</td>
                    <td className="n"><Money amount={o.spendMinor} basis="billed" /></td>
                    <td className="n data">{totalMinor > 0 ? ((o.spendMinor / totalMinor) * 100).toFixed(1) : "0.0"}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      <section className="panel">
        <header><span className="title">Attribution rules</span><span className="label">First match wins</span></header>
        <div className="pad" style={{ borderBottom: "1px solid var(--color-rule)" }}>
          <AddRuleForm />
        </div>
        {rules.length === 0 ? (
          <div className="pad mut">No rules yet. Everything shows as unattributed until you add one.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Priority</th><th>Matcher</th><th>Owner</th><th className="n"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td className="data mut">{r.priority}</td>
                  <td className="data">{describeMatcher(r.matcher)}</td>
                  <td>{r.ownerName}</td>
                  <td className="n"><DeleteRuleButton id={r.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <header>
          <span className="title">Reminder</span>
          <Pill variant="est">estimated</Pill>
        </header>
        <div className="pad mut" style={{ fontSize: 14 }}>
          The unattributed share is a metric, not a saving. Never rolled into confirmed savings.
        </div>
      </section>
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
