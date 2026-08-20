"use client";

import { useTransition } from "react";
import { removeMemberAction, revokeInvitationAction } from "./actions";

export function RemoveMemberButton({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn ghost s"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remove this member from the tenant?")) return;
        start(() => removeMemberAction(userId));
      }}
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}

export function RemoveInviteButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn ghost s"
      disabled={pending}
      onClick={() => start(() => revokeInvitationAction(id))}
    >
      {pending ? "…" : "Revoke"}
    </button>
  );
}
