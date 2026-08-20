"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { inviteMemberAction } from "./actions";

const selectCls =
  "h-9 px-2.5 border border-rule bg-surface text-ink font-mono text-[12.5px] hover:border-ink " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink";

export function InviteForm() {
  const [pending, start] = useTransition();
  const [link, setLink] = useState<string | null>(null);

  return (
    <form
      id="invite-form"
      action={(fd) =>
        start(async () => {
          const r = await inviteMemberAction(fd);
          if (!r.ok) {
            toast.error(r.error);
            return;
          }
          toast.success("Invite created.");
          setLink(r.url);
          (document.getElementById("invite-form") as HTMLFormElement | null)?.reset();
        })
      }
      className="flex flex-wrap items-end gap-2"
    >
      <div className="flex-1 min-w-[240px]">
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          required
          placeholder="finance@acme.example"
        />
      </div>
      <div>
        <Label htmlFor="invite-role">Role</Label>
        <select id="invite-role" name="role" defaultValue="member" className={selectCls}>
          <option value="member">Member</option>
          <option value="owner">Owner</option>
        </select>
      </div>
      <Button size="sm" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send invite"}
      </Button>

      {link ? (
        <p className="basis-full text-muted text-[12px] font-mono m-0">
          Link (email provider not yet wired): <a href={link} className="underline">{link}</a>
        </p>
      ) : null}
    </form>
  );
}
