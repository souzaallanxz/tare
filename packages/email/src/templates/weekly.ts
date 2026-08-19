import type { Basis } from "@tare/core";
import { formatMinor } from "@tare/core";

export type WeeklyItem = {
  headline: string;
  detail: string;
  amountMinor: number | null;
  basis: Basis;
  tone: "up" | "down" | "neutral";
};

export type WeeklyReport = {
  tenantName: string;
  workspace: string;
  weekLabel: string;               // "Mon 24 Aug"
  items: readonly WeeklyItem[];
  confirmedLifetimeMinor: number;
  currency: "EUR" | "USD";
  ingestedAt: string;
};

/**
 * Weekly report as inline-CSS, table-layout HTML. Must render in Outlook.
 * No web fonts, no background images, no absolute positioning.
 * The estimated marker survives as the WORD 'estimated' plus a violet colour —
 * dotted borders are unreliable in email clients.
 */
export function renderWeeklyReport(r: WeeklyReport): string {
  const items = r.items.map(renderItem).join("");
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Tare — ${escape(r.weekLabel)}</title></head>
<body style="margin:0;background:#F1F3F6;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#101A2B">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F3F6;padding:24px 0">
  <tr><td align="center">
    <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:640px;max-width:100%;background:#FFFFFF;border:1px solid #D7DDE5">
      <tr><td style="padding:20px 24px;border-bottom:1px solid #D7DDE5">
        <table width="100%"><tr>
          <td>${logoInline()}</td>
          <td align="right" style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.08em;color:#5A6675">${escape(r.weekLabel)}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:20px 24px 8px"><h2 style="margin:0;font-size:19px;font-weight:500;letter-spacing:-.02em">Three things this week</h2></td></tr>
      ${items}
      <tr><td style="padding:18px 24px;border-top:1px solid #D7DDE5;font-size:13px;color:#5A6675">
        Confirmed savings, twelve months: <span style="font-family:ui-monospace,Menlo,Consolas,monospace;color:#1F6F5C">${formatMinor(r.confirmedLifetimeMinor, r.currency)}</span>.
      </td></tr>
      <tr><td style="padding:12px 24px;border-top:1px solid #D7DDE5;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:#5A6675">
        Data ingested ${escape(r.ingestedAt)}. Values marked <span style="color:#7A6CA8">estimated</span> are derived, not invoice figures.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function renderItem(item: WeeklyItem): string {
  const colour = item.basis === "estimated" ? "#7A6CA8" : item.tone === "up" ? "#A63A2A" : item.tone === "down" ? "#1F6F5C" : "#101A2B";
  const suffix = item.basis === "estimated" ? " estimated" : "";
  const amt = item.amountMinor === null
    ? ""
    : `<span style="font-family:ui-monospace,Menlo,Consolas,monospace;color:${colour};white-space:nowrap">${item.tone === "up" ? "+" : item.tone === "down" ? "−" : ""}${formatMinor(Math.abs(item.amountMinor), "EUR")}${suffix}</span>`;
  return `<tr><td style="padding:16px 24px;border-top:1px solid #D7DDE5">
    <table width="100%"><tr>
      <td style="vertical-align:top">
        <div style="font-size:15px;font-weight:500">${escape(item.headline)}</div>
        <div style="font-size:13px;color:#5A6675;margin-top:4px">${escape(item.detail)}</div>
      </td>
      <td align="right" style="vertical-align:top">${amt}</td>
    </tr></table>
  </td></tr>`;
}

function logoInline(): string {
  return `<span style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-weight:500;letter-spacing:-.03em;font-size:16px;color:#101A2B">tare</span>`;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
