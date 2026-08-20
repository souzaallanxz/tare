"use client";

import { useRef, useState, useTransition } from "react";
import { clearRateCardAction, uploadRateCardAction } from "./rate-card-actions";

type Entry = {
  sku: string;
  rateMinor: number;
  currency: string;
  effectiveFrom: string;
};

const SAMPLE = `# sku,rate_in_major_units,effective_from
JOBS_COMPUTE,0.30,2025-01-01
SQL_PRO,0.55,2025-01-01
ALL_PURPOSE,0.55,2025-01-01
GPU_ML,2.10,2025-01-01`;

export function RateCardPanel({ entries, currency }: { entries: Entry[]; currency: string }) {
  const [csv, setCsv] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [fileHint, setFileHint] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setCsv(text);
    setFileHint(`${f.name} · ${text.length} chars`);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const fd = new FormData();
      fd.set("csv", csv);
      const r = await uploadRateCardAction(fd);
      if (r.ok) {
        setMsg({
          kind: "ok",
          text: `Loaded ${r.entries} row${r.entries === 1 ? "" : "s"}. Reclassified ${r.reclassified} usage row${r.reclassified === 1 ? "" : "s"}.`,
        });
        setCsv("");
        setFileHint(null);
        if (fileInput.current) fileInput.current.value = "";
      } else {
        setMsg({ kind: "err", text: r.error });
      }
    });
  }

  function onClear() {
    if (!confirm("Clear the rate card? All historical costs will fall back to list price (estimated).")) return;
    start(async () => {
      const r = await clearRateCardAction();
      setMsg({ kind: "ok", text: `Rate card cleared. Reclassified ${r.reclassified} rows to estimated.` });
    });
  }

  return (
    <>
      <div className="pad" style={{ borderBottom: "1px solid var(--color-rule)" }}>
        <p className="mut" style={{ margin: "0 0 12px", maxWidth: "72ch", fontSize: 14 }}>
          CSV columns: <span className="data">sku,rate,effective_from</span>. Rate is in major units
          (e.g. <span className="data">0.30</span> for €0.30 per DBU). The card fully replaces any
          previous one. Upload runs a reclassification pass — historic <span className="data">estimated</span>{" "}
          rows become <span className="data">billed</span> without re-reading Databricks.
        </p>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              style={{ fontSize: 13 }}
            />
            <button
              type="button"
              className="btn ghost s"
              onClick={() => {
                setCsv(SAMPLE);
                setFileHint(null);
              }}
            >
              Fill sample
            </button>
            {fileHint ? <span className="mut" style={{ fontSize: 12 }}>{fileHint}</span> : null}
          </div>
          <textarea
            name="csv"
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              setFileHint(null);
            }}
            placeholder="Paste CSV here, or upload a file above."
            rows={7}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--color-rule)",
              background: "var(--color-surface)",
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              color: "var(--color-ink)",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn s" type="submit" disabled={pending || !csv.trim()}>
              {pending ? "Applying…" : "Upload and reclassify"}
            </button>
            {entries.length > 0 ? (
              <button type="button" className="btn ghost s" disabled={pending} onClick={onClear}>
                Clear rate card
              </button>
            ) : null}
            {msg ? (
              <span
                style={{
                  fontSize: 13,
                  color: msg.kind === "ok" ? "var(--color-recovered)" : "var(--color-overrun)",
                }}
              >
                {msg.text}
              </span>
            ) : null}
          </div>
        </form>
      </div>

      {entries.length === 0 ? (
        <div className="pad mut">
          No rate card in place. Every cost reads as <span className="data">estimated</span>, priced at list.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>SKU</th><th className="n">Rate</th><th>Effective from</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={`${e.sku}-${e.effectiveFrom}`}>
                <td className="data">{e.sku}</td>
                <td className="n data">
                  {new Intl.NumberFormat("en-IE", {
                    style: "currency",
                    currency,
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  }).format(e.rateMinor / 100)}
                </td>
                <td className="data mut">{e.effectiveFrom}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
