"use client";

import { useTransition } from "react";
import { Button } from "../../components/ui/button";
import { deleteRuleAction } from "./actions";

export function DeleteRuleButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(() => deleteRuleAction(id))}>
      {pending ? "…" : "Delete"}
    </Button>
  );
}
