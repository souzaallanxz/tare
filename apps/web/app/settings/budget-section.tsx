"use client";

import { useState, useTransition } from "react";
import { deleteBudgetAction, saveBudgetAction } from "./budget-actions";

type BudgetView = {
  id: string;
  scope: { type: "workspace" } | { type: "owner"; ownerId: string };
  scopeLabel: string;
  period: "monthly" | "quarterly";
  limitMinor: number;
  thresholdPct: number;
  currency: string;
};

type Owner = { id: string; name: string };

type EditState = {
  scopeType: "workspace" | "owner";
  ownerId: string;
  period: "monthly" | "quarterly";
  limitEuros: string;
  thresholdPct: string;
};

const EMPTY: EditState = {
  scopeType: "workspace",
  ownerId: "",
  period: "monthly",
  limitEuros: "",
  thresholdPct: "90",
};

function fromBudget(b: BudgetView): EditState {
  return {
    scopeType: b.scope.type,
    ownerId: b.scope.type === "owner" ? b.scope.ownerId : "",
    period: b.period,
    limitEuros: (b.limitMinor / 100).toString(),
    thresholdPct: String(b.thresholdPct),
  };
}

export function BudgetSection({ budgets, owners, currency }: { budgets: BudgetView[]; owners: Owner[]; currency: string }) {
  const [state, setState] = useState<EditState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setState(EMPTY);
    setEditingId(null);
    setError(null);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await saveBudgetAction(fd);
      if (r.ok) reset();
      else setError(r.error);
    });
  }

  return (
    <>
      <div className="pad" style={{ borderBottom: "1px solid var(--color-rule)" }}>
        <form onSubmit={submit} style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(5, 1fr) auto auto", alignItems: "end" }}>
          <div>
            <label className="label" htmlFor="scopeType">Scope</label>
            <select
              id="scopeType"
              name="scopeType"
              value={state.scopeType}
              onChange={(e) => setState({ ...state, scopeType: e.target.value as "workspace" | "owner" })}
              style={ip}
            >
              <option value="workspace">Workspace</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          {state.scopeType === "owner" ? (
            <div>
              <label className="label" htmlFor="ownerId">Owner</label>
              <select
                id="ownerId"
                name="ownerId"
                required
                value={state.ownerId}
                onChange={(e) => setState({ ...state, ownerId: e.target.value })}
                style={ip}
              >
                <option value="">Choose…</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          ) : (
            <div />
          )}
          <div>
            <label className="label" htmlFor="period">Period</label>
            <select
              id="period"
              name="period"
              value={state.period}
              onChange={(e) => setState({ ...state, period: e.target.value as "monthly" | "quarterly" })}
              style={ip}
            >
              <option value="monthly">monthly</option>
              <option value="quarterly">quarterly</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="limitEuros">Limit ({currency})</label>
            <input
              id="limitEuros"
              name="limitEuros"
              type="number"
              min="1"
              step="any"
              required
              value={state.limitEuros}
              onChange={(e) => setState({ ...state, limitEuros: e.target.value })}
              style={ip}
            />
          </div>
          <div>
            <label className="label" htmlFor="thresholdPct">Warn at (%)</label>
            <input
              id="thresholdPct"
              name="thresholdPct"
              type="number"
              min="1"
              max="100"
              required
              value={state.thresholdPct}
              onChange={(e) => setState({ ...state, thresholdPct: e.target.value })}
              style={ip}
            />
          </div>
          <button className="btn s" type="submit" disabled={pending}>
            {pending ? "Saving…" : editingId ? "Update budget" : "Save budget"}
          </button>
          {editingId ? (
            <button type="button" className="btn ghost s" onClick={reset}>Cancel</button>
          ) : <span />}
          {error ? (
            <p style={{ gridColumn: "1 / -1", color: "var(--color-overrun)", fontSize: 13, margin: 0 }}>{error}</p>
          ) : null}
        </form>
      </div>

      {budgets.length === 0 ? (
        <div className="pad mut">No budgets yet. Overview will fall back to a computed ruler.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Scope</th><th>Period</th><th className="n">Limit</th><th className="n">Warn at</th><th className="n"></th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((b) => (
              <tr
                key={b.id}
                style={{ background: b.id === editingId ? "rgba(16,26,43,.04)" : undefined }}
              >
                <td>{b.scopeLabel}</td>
                <td className="data mut">{b.period}</td>
                <td className="n data">
                  {new Intl.NumberFormat("en-IE", { style: "currency", currency: b.currency, minimumFractionDigits: 2 }).format(b.limitMinor / 100)}
                </td>
                <td className="n data">{b.thresholdPct}%</td>
                <td className="n" style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button
                    className="btn ghost s"
                    type="button"
                    onClick={() => {
                      setEditingId(b.id);
                      setState(fromBudget(b));
                      setError(null);
                    }}
                  >
                    Edit
                  </button>
                  <DeleteButton id={b.id} onDone={() => editingId === b.id && reset()} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function DeleteButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn ghost s"
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteBudgetAction(id);
          onDone();
        })
      }
    >
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
