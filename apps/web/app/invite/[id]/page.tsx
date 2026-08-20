import { createHash } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { withoutTenant } from "@tare/db";
import { Lockup } from "../../../components/logo";
import { getSession } from "../../../lib/session";

/**
 * Invitation acceptance.
 *
 * The token is passed in the URL query string, hashed here, and compared
 * against the token_hash column. The link is single-use: on acceptance the
 * matching invitation is marked accepted, and a membership row is inserted.
 *
 * The user must be signed in first — with the exact email on the invitation.
 * That check prevents a leaked link from being redeemed by a third party who
 * happens to have an account in Tare, and it means we do not need to trust
 * anything client-side.
 */
export default async function AcceptInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const token = typeof sp["token"] === "string" ? sp["token"] : "";

  const session = await getSession();

  if (!session) {
    // Preserve the invite URL so the user comes back after signing in.
    redirect(`/login?next=${encodeURIComponent(`/invite/${id}?token=${token}`)}`);
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const outcome = await withoutTenant(async (client) => {
    const inv = await client.query<{
      tenant_id: string;
      email: string;
      role: "owner" | "member";
      expires_at: Date;
      accepted_at: Date | null;
    }>(
      `SELECT tenant_id, email, role::text AS role, expires_at, accepted_at
       FROM invitation
       WHERE id = $1 AND token_hash = $2`,
      [id, tokenHash],
    );
    const row = inv.rows[0];
    if (!row) return { kind: "invalid" as const };
    if (row.accepted_at) return { kind: "already" as const };
    if (row.expires_at.getTime() < Date.now()) return { kind: "expired" as const };
    if (row.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return { kind: "wrong_email" as const, expected: row.email };
    }

    await client.query("BEGIN");
    try {
      await client.query(
        `INSERT INTO membership (tenant_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id, user_id) DO NOTHING`,
        [row.tenant_id, session.user.id, row.role],
      );
      await client.query(
        `UPDATE invitation SET accepted_at = now() WHERE id = $1`,
        [id],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
    return { kind: "accepted" as const };
  });

  return (
    <Frame>
      {outcome.kind === "accepted" && (
        <>
          <h1 style={{ fontSize: 22, fontWeight: 500 }}>You&rsquo;re in.</h1>
          <p className="mut" style={{ marginTop: 8 }}>The tenant has been added to your account.</p>
          <Link className="btn" style={{ marginTop: 22 }} href="/overview">Open the workspace</Link>
        </>
      )}
      {outcome.kind === "invalid" && (
        <Error title="This invitation link is not valid." detail="Ask the owner to send a fresh one." />
      )}
      {outcome.kind === "expired" && (
        <Error title="This invitation has expired." detail="Ask the owner to send a fresh one — links live 72 hours." />
      )}
      {outcome.kind === "already" && (
        <Error title="This invitation has already been used." detail="If that was not you, tell the tenant owner." />
      )}
      {outcome.kind === "wrong_email" && (
        <Error
          title="This invitation is for a different email."
          detail={`Sign in as ${outcome.expected} to accept it.`}
        />
      )}
    </Frame>
  );
}

function Error({ title, detail }: { title: string; detail: string }) {
  return (
    <>
      <h1 style={{ fontSize: 22, fontWeight: 500 }}>{title}</h1>
      <p className="mut" style={{ marginTop: 8 }}>{detail}</p>
      <Link className="btn ghost" style={{ marginTop: 22 }} href="/">Back to the site</Link>
    </>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-rule)", padding: 40, maxWidth: 480, width: "100%" }}>
        <Lockup />
        <div style={{ marginTop: 24 }}>{children}</div>
      </div>
    </div>
  );
}
