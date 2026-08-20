"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { addAttributionRuleAction } from "./actions";

type MatcherType = "tag" | "run_as_domain" | "run_as_equals" | "creator" | "warehouse_id";

const selectCls =
  "h-9 px-2.5 border border-rule bg-surface text-ink font-mono text-[12.5px] hover:border-ink " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink w-full";

export function AddRuleForm() {
  const [type, setType] = useState<MatcherType>("tag");
  const [pending, start] = useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ownerName = String(fd.get("ownerName") ?? "");
    const ownerKind = String(fd.get("ownerKind") ?? "team") as "team" | "person";

    let matcher: Record<string, string>;
    switch (type) {
      case "tag":
        matcher = { type, key: String(fd.get("key") ?? ""), value: String(fd.get("value") ?? "") };
        break;
      case "run_as_domain":
        matcher = { type, domain: String(fd.get("domain") ?? "") };
        break;
      case "run_as_equals":
        matcher = { type, email: String(fd.get("email") ?? "") };
        break;
      case "creator":
        matcher = { type, user: String(fd.get("user") ?? "") };
        break;
      case "warehouse_id":
        matcher = { type, id: String(fd.get("id") ?? "") };
        break;
    }

    const target = e.currentTarget;
    start(async () => {
      const res = await addAttributionRuleAction({ ownerName, ownerKind, matcher });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Rule added.");
        target.reset();
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-2.5 md:grid-cols-[repeat(4,minmax(0,1fr))_auto] items-end"
    >
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
      <div>
        <Label htmlFor="type">Match on</Label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as MatcherType)}
          className={selectCls}
        >
          <option value="tag">tag</option>
          <option value="run_as_domain">run_as domain</option>
          <option value="run_as_equals">run_as equals</option>
          <option value="creator">creator</option>
          <option value="warehouse_id">warehouse id</option>
        </select>
      </div>
      <div>
        <Label>Value</Label>
        <MatcherFields type={type} />
      </div>
      <Button size="sm" type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add rule"}
      </Button>
    </form>
  );
}

function MatcherFields({ type }: { type: MatcherType }) {
  switch (type) {
    case "tag":
      return (
        <div className="grid grid-cols-2 gap-1.5">
          <Input name="key" placeholder="team" required />
          <Input name="value" placeholder="platform" required />
        </div>
      );
    case "run_as_domain":
      return <Input name="domain" placeholder="analytics.acme.example" required />;
    case "run_as_equals":
      return <Input name="email" placeholder="pipeline@acme.example" required />;
    case "creator":
      return <Input name="user" placeholder="m.silva" required />;
    case "warehouse_id":
      return <Input name="id" placeholder="8f2c1a…" required />;
  }
}
