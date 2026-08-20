"use client";

import { useState, useTransition } from "react";
import { assignManualOwnerAction } from "../../owners/actions";

type Owner = { id: string; name: string; kind: "team" | "person" };

export function AssignOwnerButton({
  entityId,
  owners,
  currentOwnerName,
  currentSource,
}: {
  entityId: string;
  owners: Owner[];
  currentOwnerName: string | null;
  currentSource: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"existing" | "new">(owners.length > 0 ? "existing" : "new");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    let ownerName: string;
    let ownerKind: "team" | "person";
    if (mode === "existing") {
      const id = String(fd.get("ownerId") ?? "");
      const owner = owners.find((o) => o.id === id);
      if (!owner) {
        setError("Choose an owner.");
        return;
      }
      ownerName = owner.name;
      ownerKind = owner.kind;
    } else {
      ownerName = String(fd.get("ownerName") ?? "").trim();
      ownerKind = (String(fd.get("ownerKind") ?? "team")) as "team" | "person";
      if (!ownerName) {
        setError("Enter a name.");
        return;
      }
    }
    start(async () => {
      const r = await assignManualOwnerAction({ entityId, ownerName, ownerKind });
      if (!r.ok) setError(r.error);
      else setOpen(false);
    });
  }

  if (!open) {
    return (
      <button className="btn s" type="button" onClick={() => setOpen(true)}>
        {currentOwnerName ? "Change owner" : "Assign an owner"}
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      style={{
        border: "1px solid var(--color-rule)",
        background: "var(--color-surface)",
        padding: 14,
        display: "grid",
        gap: 10,
        minWidth: 340,
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        {owners.length > 0 && (
          <button
            type="button"
            className={mode === "existing" ? "btn s" : "btn ghost s"}
            onClick={() => setMode("existing")}
          >
            Existing
          </button>
        )}
        <button
          type="button"
          className={mode === "new" ? "btn s" : "btn ghost s"}
          onClick={() => setMode("new")}
        >
          New
        </button>
      </div>

      {mode === "existing" ? (
        <div>
          <label className="label" htmlFor="ownerId">Owner</label>
          <select id="ownerId" name="ownerId" required style={ip}>
            <option value="">Choose…</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>{o.name} · {o.kind}</option>
            ))}
          </select>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
          <div>
            <label className="label" htmlFor="ownerName">Owner name</label>
            <input id="ownerName" name="ownerName" required placeholder="Data Platform" style={ip} />
          </div>
          <div>
            <label className="label" htmlFor="ownerKind">Kind</label>
            <select id="ownerKind" name="ownerKind" defaultValue="team" style={ip}>
              <option value="team">team</option>
              <option value="person">person</option>
            </select>
          </div>
        </div>
      )}

      <p className="mut" style={{ fontSize: 12, margin: 0 }}>
        Manual assignments override rule-based attribution. Rule re-runs will not touch this entity.
        {currentSource ? ` Currently resolved from: ${currentSource}.` : ""}
      </p>

      {error ? (
        <p style={{ color: "var(--color-overrun)", fontSize: 13, margin: 0 }}>{error}</p>
      ) : null}

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn s" type="submit" disabled={pending}>
          {pending ? "Assigning…" : "Assign"}
        </button>
        <button type="button" className="btn ghost s" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

const ip: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid var(--color-rule)",
  background: "var(--color-surface)",
  fontFamily: "var(--font-mono)",
  fontSize: 12.5,
};
