import { withTenant } from "@tare/db";
import { listInvitations, listMembers } from "@tare/db/repositories";
import { AppShell } from "../../components/shell";
import { Pill } from "../../components/pills";
import { requireSession } from "../../lib/session";
import { InviteForm } from "./invite-form";
import { RemoveInviteButton, RemoveMemberButton } from "./row-actions";

const REVOKE = `REVOKE USE CATALOG ON CATALOG system FROM \`tare-service-principal\`;`;

export default async function SettingsPage() {
  const session = await requireSession();
  const { members, invitations } = await withTenant(session.activeTenant.id, async (ctx) => ({
    members: await listMembers(ctx),
    invitations: await listInvitations(ctx),
  }));

  return (
    <AppShell active="settings" session={session}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 className="display">Settings</h1>
          <p className="mut" style={{ margin: "6px 0 0" }}>Rates, budgets, residency, people.</p>
        </div>
      </div>

      <section className="panel" style={{ borderLeft: "2px solid var(--color-estimated)" }}>
        <header>
          <span className="title">Rate card</span>
          <Pill variant="est">absent · list price in use</Pill>
        </header>
        <div className="pad">
          <p className="mut" style={{ maxWidth: "72ch", margin: "0 0 14px" }}>
            Without your contracted DBU rates, every cost in the product is priced at list and reads as an
            estimate. Upload the rate card and the same numbers move to billed, with no other change.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn ghost s">Upload a rate card (CSV)</button>
            <button className="btn ghost s">Connect Azure Cost Management</button>
          </div>
        </div>
      </section>

      <section className="panel">
        <header>
          <span className="title">People</span>
        </header>
        <div className="pad" style={{ borderBottom: "1px solid var(--color-rule)" }}>
          <InviteForm />
        </div>
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId}>
                <td>{m.name || <span className="mut">—</span>}</td>
                <td className="data mut">{m.email}</td>
                <td style={{ textTransform: "capitalize" }}>{m.role}</td>
                <td className="n">
                  {m.userId === session.user.id ? (
                    <span className="mut" style={{ fontSize: 12 }}>you</span>
                  ) : m.role === "owner" ? (
                    <span className="mut" style={{ fontSize: 12 }}>—</span>
                  ) : (
                    <RemoveMemberButton userId={m.userId} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {invitations.length > 0 && (
        <section className="panel">
          <header>
            <span className="title">Pending invitations</span>
            <span className="label">Expire 72 hours after sending</span>
          </header>
          <table>
            <thead>
              <tr><th>Email</th><th>Role</th><th>Expires</th><th></th></tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id}>
                  <td className="data">{inv.email}</td>
                  <td style={{ textTransform: "capitalize" }}>{inv.role}</td>
                  <td className="data mut">{formatDate(inv.expiresAt)}</td>
                  <td className="n"><RemoveInviteButton id={inv.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="panel" style={{ borderLeft: "2px solid var(--color-overrun)" }}>
        <header><span className="title">End access</span></header>
        <div className="pad">
          <p className="mut" style={{ maxWidth: "72ch", margin: "0 0 12px" }}>
            One statement in your workspace ends all access immediately. Tare keeps the aggregates already
            ingested until you delete the tenant.
          </p>
          <pre
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              background: "var(--color-ink)",
              color: "#C6CEDA",
              padding: "18px 20px",
              margin: 0,
              overflowX: "auto",
              whiteSpace: "pre",
            }}
          >
            {REVOKE}
          </pre>
        </div>
      </section>
    </AppShell>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}Z`;
}
