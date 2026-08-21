"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input, Label, Textarea } from "../../components/ui/input";
import { submitAssessmentAction } from "./actions";

const selectCls =
  "h-10 w-full px-3 border border-rule bg-surface text-ink font-mono text-[13px] hover:border-ink " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink";

export function AssessmentForm() {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="border border-rule bg-surface p-8">
        <p className="font-mono text-[11px] uppercase tracking-[.14em] text-recovered mb-3">
          Received
        </p>
        <h2 className="text-[22px] font-medium tracking-[-.018em] mb-3">
          You&rsquo;ll hear back within one business day.
        </h2>
        <p className="text-muted max-w-[62ch]">
          Replies come from a person, not a queue. Next step is a short call to confirm scope and
          the GRANT statements to apply, then five business days to the written report.
        </p>
      </div>
    );
  }

  return (
    <form
      className="border border-rule bg-surface p-8 grid gap-4"
      action={(fd) =>
        start(async () => {
          const r = await submitAssessmentAction(fd);
          if (!r.ok) toast.error(r.error);
          else {
            toast.success("Assessment request received.");
            setSent(true);
          }
        })
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" required placeholder="head.of.data@acme.example" />
        </div>
        <div>
          <Label htmlFor="company">Company</Label>
          <Input id="company" name="company" placeholder="Acme Data" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="workspaceHost">Workspace host (optional)</Label>
          <Input id="workspaceHost" name="workspaceHost" placeholder="adb-xxx.azuredatabricks.net" />
        </div>
        <div>
          <Label htmlFor="spendBand">Monthly Databricks spend</Label>
          <select id="spendBand" name="spendBand" defaultValue="15-40k" className={selectCls}>
            <option value="<15k">Under €15,000</option>
            <option value="15-40k">€15,000 – €40,000</option>
            <option value="40-100k">€40,000 – €100,000</option>
            <option value="100k+">Over €100,000</option>
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="notes">Anything worth knowing (optional)</Label>
        <Textarea id="notes" name="notes" rows={4} placeholder="Deprecated clusters we suspect; ownership gaps; renewal date; SOC 2 constraints." />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <p className="text-muted text-[13px] max-w-[52ch]">
          No auto-response. A person reads every request and replies within one business day.
        </p>
        <Button size="lg" type="submit" disabled={pending}>
          {pending ? "Sending…" : "Request assessment"}
        </Button>
      </div>
    </form>
  );
}
