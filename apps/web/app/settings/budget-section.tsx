"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
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

const selectCls =
  "h-9 w-full px-2.5 border border-rule bg-surface text-ink font-mono text-[12.5px] hover:border-ink " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink";

export function BudgetSection({
  budgets,
  owners,
  currency,
}: {
  budgets: BudgetView[];
  owners: Owner[];
  currency: string;
}) {
  const [state, setState] = useState<EditState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setState(EMPTY);
    setEditingId(null);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await saveBudgetAction(fd);
      if (r.ok) {
        toast.success(editingId ? "Budget updated." : "Budget saved.");
        reset();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <>
      <div className="px-4 py-4 border-b border-rule">
        <form
          onSubmit={submit}
          className="grid gap-2.5 md:grid-cols-[repeat(5,minmax(0,1fr))_auto_auto] items-end"
        >
          <div>
            <Label htmlFor="scopeType">Scope</Label>
            <select
              id="scopeType"
              name="scopeType"
              value={state.scopeType}
              onChange={(e) => setState({ ...state, scopeType: e.target.value as "workspace" | "owner" })}
              className={selectCls}
            >
              <option value="workspace">Workspace</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          {state.scopeType === "owner" ? (
            <div>
              <Label htmlFor="ownerId">Owner</Label>
              <select
                id="ownerId"
                name="ownerId"
                required
                value={state.ownerId}
                onChange={(e) => setState({ ...state, ownerId: e.target.value })}
                className={selectCls}
              >
                <option value="">Choose…</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          ) : (
            <div />
          )}
          <div>
            <Label htmlFor="period">Period</Label>
            <select
              id="period"
              name="period"
              value={state.period}
              onChange={(e) => setState({ ...state, period: e.target.value as "monthly" | "quarterly" })}
              className={selectCls}
            >
              <option value="monthly">monthly</option>
              <option value="quarterly">quarterly</option>
            </select>
          </div>
          <div>
            <Label htmlFor="limitEuros">Limit ({currency})</Label>
            <Input
              id="limitEuros"
              name="limitEuros"
              type="number"
              min="1"
              step="any"
              required
              value={state.limitEuros}
              onChange={(e) => setState({ ...state, limitEuros: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="thresholdPct">Warn at (%)</Label>
            <Input
              id="thresholdPct"
              name="thresholdPct"
              type="number"
              min="1"
              max="100"
              required
              value={state.thresholdPct}
              onChange={(e) => setState({ ...state, thresholdPct: e.target.value })}
            />
          </div>
          <Button size="sm" type="submit" disabled={pending}>
            {pending ? "Saving…" : editingId ? "Update budget" : "Save budget"}
          </Button>
          {editingId ? (
            <Button variant="ghost" size="sm" type="button" onClick={reset}>
              Cancel
            </Button>
          ) : (
            <span />
          )}
        </form>
      </div>

      {budgets.length === 0 ? (
        <div className="px-4 py-4 text-muted">
          No budgets yet. Overview will fall back to a computed ruler.
        </div>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Scope</TH>
              <TH>Period</TH>
              <TH className="text-right">Limit</TH>
              <TH className="text-right">Warn at</TH>
              <TH className="text-right" />
            </TR>
          </THead>
          <TBody>
            {budgets.map((b) => (
              <TR key={b.id} className={b.id === editingId ? "bg-ink/[.04]" : undefined}>
                <TD>{b.scopeLabel}</TD>
                <TD className="font-mono text-muted">{b.period}</TD>
                <TD className="text-right font-mono tabular-nums">
                  {new Intl.NumberFormat("en-IE", {
                    style: "currency",
                    currency: b.currency,
                    minimumFractionDigits: 2,
                  }).format(b.limitMinor / 100)}
                </TD>
                <TD className="text-right font-mono tabular-nums">{b.thresholdPct}%</TD>
                <TD className="text-right">
                  <span className="flex gap-1.5 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => {
                        setEditingId(b.id);
                        setState(fromBudget(b));
                      }}
                    >
                      Edit
                    </Button>
                    <DeleteButton id={b.id} onDone={() => editingId === b.id && reset()} />
                  </span>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}

function DeleteButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
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
    </Button>
  );
}
