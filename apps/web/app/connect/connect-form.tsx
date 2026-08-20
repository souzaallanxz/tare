"use client";

import { useState, useTransition } from "react";
import { saveConnectionAction, startIngestionAction, testConnectionAction } from "./actions";

type Props = {
  initial: {
    host: string;
    clientId: string;
    warehouseId: string | null;
    hasSecret: boolean;
  };
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--color-rule)",
  background: "var(--color-surface)",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  color: "var(--color-ink)",
};

export function ConnectForm({ initial }: Props) {
  const [saving, startSave] = useTransition();
  const [testing, startTest] = useTransition();
  const [ingesting, startIngest] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function onSave(fd: FormData) {
    startSave(async () => {
      const r = await saveConnectionAction(fd);
      setMsg(r.ok ? { kind: "ok", text: "Saved." } : { kind: "err", text: r.error });
    });
  }

  return (
    <>
      <form action={onSave} style={{ display: "grid", gap: 14, maxWidth: 640 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Workspace host" name="host" defaultValue={initial.host} placeholder="adb-0000000000000000.0.azuredatabricks.net" />
          <Field label="Client ID" name="clientId" defaultValue={initial.clientId} placeholder="00000000-0000-0000-0000-000000000000" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field
            label="Client secret"
            name="clientSecret"
            type="password"
            placeholder={initial.hasSecret ? "•••••••• (leave blank to keep)" : "OAuth client secret"}
            required={!initial.hasSecret}
          />
          <Field label="Warehouse ID" name="warehouseId" defaultValue={initial.warehouseId ?? ""} placeholder="Optional" />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn s" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save connection"}
          </button>
          <button
            type="button"
            className="btn ghost s"
            disabled={testing || !initial.hasSecret}
            onClick={() =>
              startTest(async () => {
                const r = await testConnectionAction();
                setMsg({ kind: r.ok ? "ok" : "err", text: r.message });
              })
            }
          >
            {testing ? "Testing…" : "Test the connection"}
          </button>
          <button
            type="button"
            className="btn s"
            disabled={ingesting}
            onClick={() =>
              startIngest(async () => {
                const r = await startIngestionAction(30);
                setMsg({ kind: r.ok ? "ok" : "err", text: r.message });
              })
            }
          >
            {ingesting ? "Ingesting…" : "Start ingestion (30 d)"}
          </button>
        </div>
      </form>

      {msg && (
        <p
          style={{
            marginTop: 14,
            fontSize: 13,
            color: msg.kind === "ok" ? "var(--color-recovered)" : "var(--color-overrun)",
            fontFamily: msg.kind === "err" ? "var(--font-mono)" : undefined,
          }}
        >
          {msg.text}
        </p>
      )}
    </>
  );
}

function Field(props: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label" htmlFor={props.name}>{props.label}</label>
      <input
        id={props.name}
        name={props.name}
        type={props.type ?? "text"}
        defaultValue={props.defaultValue ?? ""}
        placeholder={props.placeholder}
        required={props.required}
        autoComplete="off"
        style={input}
      />
    </div>
  );
}
