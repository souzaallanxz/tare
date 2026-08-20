"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Input, Label } from "../../../components/ui/input";
import { assignManualOwnerAction } from "../../owners/actions";

type Owner = { id: string; name: string; kind: "team" | "person" };

const selectCls =
  "h-9 w-full px-2.5 border border-rule bg-surface text-ink font-mono text-[12.5px] hover:border-ink " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink";

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

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    let ownerName: string;
    let ownerKind: "team" | "person";
    if (mode === "existing") {
      const id = String(fd.get("ownerId") ?? "");
      const owner = owners.find((o) => o.id === id);
      if (!owner) {
        toast.error("Choose an owner.");
        return;
      }
      ownerName = owner.name;
      ownerKind = owner.kind;
    } else {
      ownerName = String(fd.get("ownerName") ?? "").trim();
      ownerKind = (String(fd.get("ownerKind") ?? "team")) as "team" | "person";
      if (!ownerName) {
        toast.error("Enter a name.");
        return;
      }
    }
    start(async () => {
      const r = await assignManualOwnerAction({ entityId, ownerName, ownerKind });
      if (!r.ok) toast.error(r.error);
      else {
        toast.success("Owner assigned.");
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <Button size="sm" type="button" onClick={() => setOpen(true)}>
        {currentOwnerName ? "Change owner" : "Assign an owner"}
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="border border-rule bg-surface p-3.5 grid gap-2.5 min-w-[340px]">
      <div className="flex gap-2">
        {owners.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant={mode === "existing" ? "default" : "ghost"}
            onClick={() => setMode("existing")}
          >
            Existing
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant={mode === "new" ? "default" : "ghost"}
          onClick={() => setMode("new")}
        >
          New
        </Button>
      </div>

      {mode === "existing" ? (
        <div>
          <Label htmlFor="ownerId">Owner</Label>
          <select id="ownerId" name="ownerId" required className={selectCls}>
            <option value="">Choose…</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>{o.name} · {o.kind}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div>
            <Label htmlFor="ownerName">Owner name</Label>
            <Input id="ownerName" name="ownerName" required placeholder="Data Platform" />
          </div>
          <div>
            <Label htmlFor="ownerKind">Kind</Label>
            <select id="ownerKind" name="ownerKind" defaultValue="team" className={selectCls}>
              <option value="team">team</option>
              <option value="person">person</option>
            </select>
          </div>
        </div>
      )}

      <p className="text-muted text-[12px] m-0">
        Manual assignments override rule-based attribution. Rule re-runs will not touch this entity.
        {currentSource ? ` Currently resolved from: ${currentSource}.` : ""}
      </p>

      <div className="flex gap-2">
        <Button size="sm" type="submit" disabled={pending}>
          {pending ? "Assigning…" : "Assign"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
