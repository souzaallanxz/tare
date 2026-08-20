"use client";

import { useTransition } from "react";
import type { RecommendationState } from "@tare/core";
import { runVerificationSweepAction, transitionAction } from "./actions";

const NEXT: Partial<Record<RecommendationState, { label: string; steps: RecommendationState[] }>> = {
  open:     { label: "Accept",       steps: ["accepted"] },
  accepted: { label: "Mark applied", steps: ["applied", "verifying"] },
  applied:  { label: "Start verifying", steps: ["verifying"] },
};

export function TransitionButton({ id, state }: { id: string; state: RecommendationState }) {
  const [pending, start] = useTransition();
  const cfg = NEXT[state];
  if (!cfg) return null;
  return (
    <button
      className="btn s"
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
    </button>
  );
}

export function SweepButton() {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn ghost s"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await runVerificationSweepAction();
          alert(
            `Checked ${r.checked} · ${r.confirmed} confirmed · ${r.notObserved} not observed.`,
          );
        })
      }
    >
      {pending ? "Sweeping…" : "Run verification sweep"}
    </button>
  );
}
