"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Textarea } from "../../components/ui/input";
import { Card, CardBody, CardHeader, CardHint, CardTitle } from "../../components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
import type { CsvAnalysis } from "@tare/ingest";
import { analyzeCsvAction, importCsvAction } from "./actions";

const SAMPLE = `usage_date,sku_name,entity_id,usage_quantity,list_price
2025-08-01,JOBS_COMPUTE,nightly-ingest,412.5,0.30
2025-08-01,SQL_PRO,ad-hoc-sql,186.0,0.55
2025-08-01,ALL_PURPOSE,shared-interactive,96.4,0.55
2025-08-02,JOBS_COMPUTE,nightly-ingest,409.1,0.30
2025-08-02,SQL_PRO,ad-hoc-sql,180.2,0.55`;

export function ImportForm() {
  const [csv, setCsv] = useState("");
  const [fileHint, setFileHint] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CsvAnalysis | null>(null);
  const [analysing, startAnalyse] = useTransition();
  const [importing, startImport] = useTransition();
  const fileInput = useRef<HTMLInputElement | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setCsv(text);
    setFileHint(`${f.name} · ${(text.length / 1024).toFixed(1)} KB`);
    setAnalysis(null);
  }

  function onAnalyse() {
    startAnalyse(async () => {
      const r = await analyzeCsvAction(csv);
      if (!r.ok) {
        toast.error(r.error);
        setAnalysis(null);
        return;
      }
      setAnalysis(r.analysis);
    });
  }

  function onImport() {
    if (!analysis) return;
    if (!confirm(`Import ${analysis.validRows} rows into your workspace?`)) return;
    startImport(async () => {
      const r = await importCsvAction(csv);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Imported ${r.rows} rows. ${r.findings} finding${r.findings === 1 ? "" : "s"} detected.`);
      setCsv("");
      setFileHint(null);
      setAnalysis(null);
      if (fileInput.current) fileInput.current.value = "";
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1 · Provide the CSV</CardTitle>
          <CardHint>File never touches disk — parsed in memory</CardHint>
        </CardHeader>
        <CardBody className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="text-[13px]"
              onChange={onFile}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCsv(SAMPLE);
                setFileHint(null);
                setAnalysis(null);
              }}
            >
              Fill sample
            </Button>
            {fileHint ? <span className="text-muted text-[12px]">{fileHint}</span> : null}
          </div>
          <Textarea
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              setFileHint(null);
              setAnalysis(null);
            }}
            placeholder="Paste a system.billing.usage CSV export here, or upload a file above."
            rows={8}
          />
          <div>
            <Button
              size="sm"
              type="button"
              disabled={analysing || !csv.trim()}
              onClick={onAnalyse}
            >
              {analysing ? "Analysing…" : "Analyse"}
            </Button>
          </div>
        </CardBody>
      </Card>

      {analysis ? <AnalysisPanel analysis={analysis} /> : null}

      {analysis && analysis.missing.length === 0 && analysis.validRows > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>3 · Import</CardTitle>
            <CardHint>Runs attribution, rollups, and rules on the imported window</CardHint>
          </CardHeader>
          <CardBody>
            <p className="text-muted mb-3.5 max-w-[72ch]">
              A CSV import only supplies <span className="font-mono">usage_daily</span>. Rules that require
              cluster config, job timeline or query history will show as skipped in the ingestion summary.
              Every cost lands as <span className="font-mono">estimated</span> until a rate card is uploaded
              in Settings.
            </p>
            <Button size="sm" type="button" disabled={importing} onClick={onImport}>
              {importing ? "Importing…" : `Import ${analysis.validRows} rows`}
            </Button>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: CsvAnalysis }) {
  const rejectEntries = Object.entries(analysis.rejectReasons);
  return (
    <Card>
      <CardHeader>
        <CardTitle>2 · Validation report</CardTitle>
        {analysis.missing.length > 0 ? (
          <Badge variant="overrun">{analysis.missing.length} required column{analysis.missing.length === 1 ? "" : "s"} missing</Badge>
        ) : analysis.rejectedRows > 0 ? (
          <Badge variant="threshold">{analysis.rejectedRows} row{analysis.rejectedRows === 1 ? "" : "s"} rejected</Badge>
        ) : (
          <Badge variant="recovered">clean</Badge>
        )}
      </CardHeader>
      <CardBody className="space-y-4">
        {analysis.missing.length > 0 ? (
          <p className="text-overrun text-[13px]">
            Missing: {analysis.missing.join(", ")}. Rename them in the CSV to match, or drop back and
            re-export from Databricks.
          </p>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule">
          <Stat label="Rows total" value={analysis.totalRows} />
          <Stat label="Valid" value={analysis.validRows} />
          <Stat label="Rejected" value={analysis.rejectedRows} />
          <Stat
            label="Date range"
            value={
              analysis.dateRange ? `${analysis.dateRange.start} → ${analysis.dateRange.end}` : "—"
            }
          />
          <Stat label="Distinct entities" value={analysis.distinctEntities} />
          <Stat label="Distinct SKUs" value={analysis.distinctSkus} />
          <Stat label="Capabilities" value="usage_daily only" />
          <Stat label="Provenance" value="csv_import" />
        </div>

        {rejectEntries.length > 0 ? (
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[.12em] text-muted mb-2">
              Rejection reasons
            </div>
            <Table>
              <THead>
                <TR>
                  <TH>Reason</TH>
                  <TH className="text-right">Rows</TH>
                </TR>
              </THead>
              <TBody>
                {rejectEntries.map(([reason, count]) => (
                  <TR key={reason}>
                    <TD className="font-mono">{reason}</TD>
                    <TD className="text-right font-mono tabular-nums">{count}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        ) : null}

        {analysis.sampleValid.length > 0 ? (
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[.12em] text-muted mb-2">
              First 5 valid rows
            </div>
            <Table>
              <THead>
                <TR>
                  {analysis.header.map((h) => (
                    <TH key={h}>{h}</TH>
                  ))}
                </TR>
              </THead>
              <TBody>
                {analysis.sampleValid.map((r, i) => (
                  <TR key={i}>
                    {analysis.header.map((h) => (
                      <TD key={h} className="font-mono text-[12px]">{r[h]}</TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-surface px-4 py-3">
      <div className="font-mono text-[11px] uppercase tracking-[.12em] text-muted">{label}</div>
      <div className="font-mono font-medium text-[16px] tabular-nums mt-1">{value}</div>
    </div>
  );
}
