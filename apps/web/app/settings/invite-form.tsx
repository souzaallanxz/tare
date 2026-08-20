"use client";

import { useState, useTransition } from "react";
import { inviteMemberAction } from "./actions";

export function InviteForm() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: true; url: string } | { ok: false; error: string } | null>(null);

  return (
    <form
      action={(fd) =>
        start(async () => {
          const r = await inviteMemberAction(fd);
          setResult(r);
        })
      }
      style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}
    >
      <div style={{ flex: 1, minWidth: 240 }}>
        <label className="label" htmlFor="invite-email">Email</label>
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          placeholder="finance@acme.example"
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid var(--color-rule)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            background: "var(--color-surface)",
          }}
        />
      </div>
      <select
        name="role"
        defaultValue="member"
        style={{ padding: "8px 12px", border: "1px solid var(--color-rule)", background: "var(--color-surface)", fontSize: 13 }}
      >
        <option value="member">Member</option>
        <option value="owner">Owner</option>
      </select>
      <button className="btn s" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send invite"}
      </button>

      {result && !result.ok ? (
        <p style={{ width: "100%", color: "var(--color-overrun)", fontSize: 13, margin: 0 }}>{result.error}</p>
      ) : null}
      {result && result.ok ? (
        <p style={{ width: "100%", color: "var(--color-muted)", fontSize: 12, margin: 0, fontFamily: "var(--font-mono)" }}>
          Link (email provider not yet wired): <a href={result.url}>{result.url}</a>
        </p>
      ) : null}
    </form>
  );
}
