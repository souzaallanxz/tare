"use client";

import { useState, useTransition } from "react";
import { addAttributionRuleAction } from "./actions";

type MatcherType = "tag" | "run_as_domain" | "run_as_equals" | "creator" | "warehouse_id";

export function AddRuleForm() {
  const [type, setType] = useState<MatcherType>("tag");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
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

    start(async () => {
      const res = await addAttributionRuleAction({ ownerName, ownerKind, matcher });
      if (!res.ok) setError(res.error);
      else (e.target as HTMLFormElement).reset();
    });
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(4, 1fr) auto", alignItems: "end" }}>
      <div>
        <label className="label" htmlFor="ownerName">Owner name</label>
        <input id="ownerName" name="ownerName" required style={ip} placeholder="Data Platform" />
      </div>
      <div>
        <label className="label" htmlFor="ownerKind">Kind</label>
        <select id="ownerKind" name="ownerKind" defaultValue="team" style={ip}>
          <option value="team">team</option>
          <option value="person">person</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="type">Match on</label>
        <select id="type" value={type} onChange={(e) => setType(e.target.value as MatcherType)} style={ip}>
          <option value="tag">tag</option>
          <option value="run_as_domain">run_as domain</option>
          <option value="run_as_equals">run_as equals</option>
          <option value="creator">creator</option>
          <option value="warehouse_id">warehouse id</option>
        </select>
      </div>
      <div>
        <label className="label">Value</label>
        <MatcherFields type={type} />
      </div>
      <button className="btn s" type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add rule"}
      </button>
      {error ? (
        <p style={{ gridColumn: "1 / -1", color: "var(--color-overrun)", fontSize: 13, margin: 0 }}>{error}</p>
      ) : null}
    </form>
  );
}

function MatcherFields({ type }: { type: MatcherType }) {
  switch (type) {
    case "tag":
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <input name="key" placeholder="team" required style={ip} />
          <input name="value" placeholder="platform" required style={ip} />
        </div>
      );
    case "run_as_domain":
      return <input name="domain" placeholder="analytics.acme.example" required style={ip} />;
    case "run_as_equals":
      return <input name="email" placeholder="pipeline@acme.example" required style={ip} />;
    case "creator":
      return <input name="user" placeholder="m.silva" required style={ip} />;
    case "warehouse_id":
      return <input name="id" placeholder="8f2c1a…" required style={ip} />;
  }
}

const ip: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid var(--color-rule)",
  background: "var(--color-surface)",
  fontFamily: "var(--font-mono)",
  fontSize: 12.5,
};
