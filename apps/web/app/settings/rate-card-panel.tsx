"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
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
    start(async () => {
      const fd = new FormData();
      fd.set("csv", csv);
      const r = await uploadRateCardAction(fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(
        `Loaded ${r.entries} row${r.entries === 1 ? "" : "s"}. Reclassified ${r.reclassified} usage row${r.reclassified === 1 ? "" : "s"}.`,
      );
      setCsv("");
      setFileHint(null);
      if (fileInput.current) fileInput.current.value = "";
    });
  }

  function onClear() {
    if (!confirm("Clear the rate card? All historical costs will fall back to list price (estimated).")) return;
    start(async () => {
      const r = await clearRateCardAction();
      toast.success(`Rate card cleared. Reclassified ${r.reclassified} rows to estimated.`);
    });
  }

  return (
    <>
      <div className="px-4 py-4 border-b border-rule">
        <p className="text-muted mb-3 max-w-[72ch] text-[14px]">
          CSV columns: <span className="font-mono">sku,rate,effective_from</span>. Rate in major units
          (e.g. <span className="font-mono">0.30</span> for €0.30 per DBU). Upload replaces the entire
          card and runs a reclassification pass — historic{" "}
          <span className="font-mono">estimated</span> rows become{" "}
          <span className="font-mono">billed</span> without re-reading Databricks.
        </p>

        <form onSubmit={onSubmit} className="grid gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="text-[13px]"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCsv(SAMPLE);
                setFileHint(null);
              }}
            >
              Fill sample
            </Button>
            {fileHint ? <span className="text-muted text-[12px]">{fileHint}</span> : null}
          </div>
          <Textarea
            name="csv"
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              setFileHint(null);
            }}
            placeholder="Paste CSV here, or upload a file above."
            rows={7}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" type="submit" disabled={pending || !csv.trim()}>
              {pending ? "Applying…" : "Upload and reclassify"}
            </Button>
            {entries.length > 0 ? (
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onClear}>
                Clear rate card
              </Button>
            ) : null}
          </div>
        </form>
      </div>

      {entries.length === 0 ? (
        <div className="px-4 py-4 text-muted">
          No rate card in place. Every cost reads as <span className="font-mono">estimated</span>, priced at list.
        </div>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>SKU</TH>
              <TH className="text-right">Rate</TH>
              <TH>Effective from</TH>
            </TR>
          </THead>
          <TBody>
            {entries.map((e) => (
              <TR key={`${e.sku}-${e.effectiveFrom}`}>
                <TD className="font-mono">{e.sku}</TD>
                <TD className="text-right font-mono tabular-nums">
                  {new Intl.NumberFormat("en-IE", {
                    style: "currency",
                    currency,
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  }).format(e.rateMinor / 100)}
                </TD>
                <TD className="font-mono text-muted">{e.effectiveFrom}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
