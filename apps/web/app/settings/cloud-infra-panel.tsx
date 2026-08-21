"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
import { analyzeAzureAction, clearAzureAction, importAzureAction } from "./cloud-infra-actions";

type Summary = {
  totalMinor: number;
  currency: string;
  rows: number;
  windowStart: string | null;
  windowEnd: string | null;
  byService: { service: string; costMinor: number }[];
};

export function CloudInfraPanel({ summary }: { summary: Summary }) {
  const [csv, setCsv] = useState("");
  const [fileHint, setFileHint] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileInput = useRef<HTMLInputElement | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setCsv(text);
    setFileHint(`${f.name} · ${(text.length / 1024).toFixed(1)} KB`);
  }

  function onAnalyse() {
    start(async () => {
      const r = await analyzeAzureAction(csv);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const a = r.analysis;
      toast.success(
        `${a.validRows} valid rows · ${a.rejectedRows} rejected · ${a.distinctServices} services${a.dateRange ? ` · ${a.dateRange.start} → ${a.dateRange.end}` : ""}`,
      );
    });
  }

  function onImport() {
    if (!confirm("Import these Azure cost lines? Existing rows for the same (date, service, resource_group, region) are overwritten.")) return;
    start(async () => {
      const r = await importAzureAction(csv);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(`Imported ${r.rows} cloud infra lines.`);
        setCsv("");
        setFileHint(null);
        if (fileInput.current) fileInput.current.value = "";
      }
    });
  }

  function onClear() {
    if (!confirm("Clear all Azure cost lines? This does not affect Databricks usage rows.")) return;
    start(async () => {
      await clearAzureAction();
      toast.success("Cleared.");
    });
  }

  return (
    <>
      <div className="px-4 py-4 border-b border-rule space-y-2.5">
        <p className="text-muted text-[14px] max-w-[72ch]">
          Upload an Azure Cost Management daily export (Actual Cost or Amortized). Recognised columns:
          <span className="font-mono"> Date, ServiceName, ResourceGroup, ResourceLocation,
          CostInBillingCurrency, BillingCurrency</span>. Rows land as{" "}
          <span className="font-mono">billed</span> immediately — this is invoiced data, not a
          projection.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="text-[13px]"
          />
          {fileHint ? <span className="text-muted text-[12px]">{fileHint}</span> : null}
        </div>
        <Textarea
          value={csv}
          onChange={(e) => {
            setCsv(e.target.value);
            setFileHint(null);
          }}
          placeholder="Paste an Azure Cost Management CSV here, or upload the file above."
          rows={7}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" type="button" disabled={pending || !csv.trim()} onClick={onAnalyse}>
            {pending ? "…" : "Analyse"}
          </Button>
          <Button size="sm" variant="ghost" type="button" disabled={pending || !csv.trim()} onClick={onImport}>
            Import
          </Button>
          {summary.rows > 0 ? (
            <Button size="sm" variant="danger" type="button" disabled={pending} onClick={onClear}>
              Clear Azure data
            </Button>
          ) : null}
        </div>
      </div>

      {summary.rows === 0 ? (
        <div className="px-4 py-4 text-muted">
          No cloud infrastructure data yet. Overview will read Databricks-only totals until this is populated.
        </div>
      ) : (
        <>
          <div className="px-4 py-3 border-b border-rule text-[13px] text-muted">
            {summary.rows.toLocaleString("en-IE")} rows · {summary.windowStart} → {summary.windowEnd} ·
            currency {summary.currency}
          </div>
          <Table>
            <THead>
              <TR>
                <TH>Service</TH>
                <TH className="text-right">Cost (window)</TH>
              </TR>
            </THead>
            <TBody>
              {summary.byService.map((r) => (
                <TR key={r.service}>
                  <TD className="font-mono">{r.service}</TD>
                  <TD className="text-right font-mono tabular-nums">
                    {new Intl.NumberFormat("en-IE", {
                      style: "currency",
                      currency: summary.currency,
                      maximumFractionDigits: 0,
                    }).format(r.costMinor / 100)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </>
      )}
    </>
  );
}
