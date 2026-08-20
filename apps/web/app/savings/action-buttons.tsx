"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { RecommendationState } from "@tare/core";
import { Button } from "../../components/ui/button";
import { runVerificationSweepAction, transitionAction } from "./actions";

const NEXT: Partial<Record<RecommendationState, { label: string; steps: RecommendationState[] }>> = {
  open:     { label: "Accept",           steps: ["accepted"] },
  accepted: { label: "Mark applied",     steps: ["applied", "verifying"] },
  applied:  { label: "Start verifying",  steps: ["verifying"] },
};

export function TransitionButton({ id, state }: { id: string; state: RecommendationState }) {
  const [pending, start] = useTransition();
  const cfg = NEXT[state];
  if (!cfg) return null;
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          for (const to of cfg.steps) {
            await transitionAction(id, to);
          }
        })
      }
    >
      {pending ? "…" : cfg.label}
    </Button>
  );
}

export function SweepButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await runVerificationSweepAction();
          toast.success(
            `Checked ${r.checked} · ${r.confirmed} confirmed · ${r.notObserved} not observed.`,
          );
        })
      }
    >
      {pending ? "Sweeping…" : "Run verification sweep"}
    </Button>
  );
}
