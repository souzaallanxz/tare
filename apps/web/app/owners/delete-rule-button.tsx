"use client";

import { useTransition } from "react";
import { deleteRuleAction } from "./actions";

export function DeleteRuleButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn ghost s" disabled={pending} onClick={() => start(() => deleteRuleAction(id))}>
      {pending ? "…" : "Delete"}
    </button>
  );
}
