"use client";

import { useState, useTransition } from "react";
import { deleteBudgetAction, saveBudgetAction } from "./budget-actions";

export function AddBudgetForm({ owners }: { owners: { id: string; name: string }[] }) {
  const [pending, start] = useTransition();
  const [scopeType, setScopeType] = useState<"workspace" | "owner">("workspace");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      action={(fd) =>
        start(async () => {
          const r = await saveBudgetAction(fd);
          setError(r.ok ? null : r.error);
        })
      }
      style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(5, 1fr) auto", alignItems: "end" }}
    >
      <div>
        <label className="label" htmlFor="scopeType">Scope</label>
        <select id="scopeType" name="scopeType" value={scopeType} onChange={(e) => setScopeType(e.target.value as "workspace" | "owner")} style={ip}>
          <option value="workspace">Workspace</option>
          <option value="owner">Owner</option>
        </select>
      </div>
      {scopeType === "owner" ? (
        <div>
          <label className="label" htmlFor="ownerId">Owner</label>
          <select id="ownerId" name="ownerId" required style={ip}>
            <option value="">Choose…</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      ) : (
        <div />
      )}
      <div>
        <label className="label" htmlFor="period">Period</label>
        <select id="period" name="period" defaultValue="monthly" style={ip}>
          <option value="monthly">monthly</option>
          <option value="quarterly">quarterly</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="limitEuros">Limit (€)</label>
        <input id="limitEuros" name="limitEuros" type="number" min="1" step="100" required style={ip} />
      </div>
      <div>
        <label className="label" htmlFor="thresholdPct">Warn at (%)</label>
        <input id="thresholdPct" name="thresholdPct" type="number" min="1" max="100" defaultValue="90" required style={ip} />
      </div>
      <button className="btn s" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save budget"}
      </button>
      {error ? <p style={{ gridColumn: "1 / -1", color: "var(--color-overrun)", fontSize: 13, margin: 0 }}>{error}</p> : null}
    </form>
  );
}

export function DeleteBudgetButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn ghost s" disabled={pending} onClick={() => start(() => deleteBudgetAction(id))}>
      {pending ? "…" : "Delete"}
    </button>
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
