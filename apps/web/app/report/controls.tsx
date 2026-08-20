"use client";

import { useState, useTransition } from "react";
import {
  addRecipientAction,
  removeRecipientAction,
  sendReportAction,
} from "./actions";

export function SendButtons() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function fire(scope: "test" | "all") {
    start(async () => {
      const r = await sendReportAction(scope);
      setMsg(r.ok ? `Sent to ${r.sent} recipient${r.sent === 1 ? "" : "s"}.` : r.error);
    });
  }

  return (
    <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button className="btn ghost s" type="button" disabled={pending} onClick={() => fire("test")}>
        {pending ? "…" : "Send a test to me"}
      </button>
      <button className="btn s" type="button" disabled={pending} onClick={() => fire("all")}>
        {pending ? "…" : "Send now"}
      </button>
      {msg ? <span className="mut" style={{ fontSize: 12 }}>{msg}</span> : null}
    </span>
  );
}

export function AddRecipientForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      action={(fd) =>
        start(async () => {
          const r = await addRecipientAction(fd);
          setError(r.ok ? null : r.error);
          if (r.ok) (document.getElementById("rec-form") as HTMLFormElement | null)?.reset();
        })
      }
      id="rec-form"
      style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}
    >
      <div style={{ flex: 1, minWidth: 200 }}>
        <label className="label" htmlFor="rec-email">Email</label>
        <input
          id="rec-email"
          name="email"
          type="email"
          required
          placeholder="cfo@acme.example"
          style={inputStyle}
        />
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <label className="label" htmlFor="rec-name">Name (optional)</label>
        <input id="rec-name" name="name" style={inputStyle} />
      </div>
      <button className="btn s" type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add recipient"}
      </button>
      {error ? (
        <p style={{ width: "100%", color: "var(--color-overrun)", fontSize: 13, margin: 0 }}>{error}</p>
      ) : null}
    </form>
  );
}

export function RemoveRecipientButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn ghost s" disabled={pending} onClick={() => start(() => removeRecipientAction(id))}>
      {pending ? "…" : "Remove"}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid var(--color-rule)",
  background: "var(--color-surface)",
  fontFamily: "var(--font-mono)",
  fontSize: 12.5,
};
