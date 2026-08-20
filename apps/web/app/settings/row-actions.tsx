"use client";

import { useTransition } from "react";
import { Button } from "../../components/ui/button";
import { removeMemberAction, revokeInvitationAction } from "./actions";

export function RemoveMemberButton({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remove this member from the tenant?")) return;
        start(() => removeMemberAction(userId));
      }}
    >
      {pending ? "Removing…" : "Remove"}
    </Button>
  );
}

export function RemoveInviteButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(() => revokeInvitationAction(id))}>
      {pending ? "…" : "Revoke"}
    </Button>
  );
}
