import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { AnomalyRow } from "@tare/db/repositories";
import { Money } from "./money";
import { Table, TBody, TD, TH, THead, TR } from "./ui/table";

/**
 * Compact anomaly list. Both directions show — a dip matters as much
 * as a spike (a job that stops running is either a saving or a broken job).
 */
export function AnomalyList({
  rows,
  showEntity = true,
}: {
  rows: readonly AnomalyRow[];
  showEntity?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="px-4 py-4 text-muted text-sm">
        No anomalies in the recent window. Signal is quiet.
      </div>
    );
  }
  return (
    <Table>
      <THead>
        <TR>
          <TH>Date</TH>
          {showEntity ? <TH>Entity</TH> : null}
          <TH>Direction</TH>
          <TH className="text-right">Observed</TH>
          <TH className="text-right">Baseline</TH>
          <TH className="text-right">Delta</TH>
          <TH className="text-right">Score</TH>
        </TR>
      </THead>
      <TBody>
        {rows.map((a) => {
          const currency = a.currency as "EUR" | "USD";
          const tone = a.direction === "up" ? "up" : "down";
          return (
            <TR key={a.id}>
              <TD className="font-mono text-muted">{a.detectedOn}</TD>
              {showEntity ? (
                <TD>
                  {a.entityName ? (
                    <Link href={`/workload/${encodeURIComponent(a.entityName)}` as never} className="hover:underline">
                      {a.entityName}
                    </Link>
                  ) : (
                    <span className="text-muted">workspace</span>
                  )}
                </TD>
              ) : null}
              <TD>
                <span className={a.direction === "up" ? "text-overrun" : "text-recovered"}>
                  <span className="inline-flex items-center gap-1">
                    {a.direction === "up" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {a.direction}
                  </span>
                </span>
              </TD>
              <TD className="text-right">
                <Money amount={a.observedMinor} basis="billed" currency={currency} />
              </TD>
              <TD className="text-right">
                <Money amount={a.baselineMedianMinor} basis="billed" currency={currency} />
              </TD>
              <TD className="text-right">
                <Money amount={Math.abs(a.deltaMinor)} basis="billed" currency={currency} tone={tone} />
              </TD>
              <TD className="text-right font-mono tabular-nums">
                {a.score > 0 ? "+" : ""}{a.score.toFixed(2)}σ
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
