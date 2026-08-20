"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import {
  addRecipientAction,
  removeRecipientAction,
  sendReportAction,
} from "./actions";

export function SendButtons() {
  const [pending, start] = useTransition();

  function fire(scope: "test" | "all") {
    start(async () => {
      const r = await sendReportAction(scope);
      if (r.ok) toast.success(`Sent to ${r.sent} recipient${r.sent === 1 ? "" : "s"}.`);
      else toast.error(r.error);
    });
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => fire("test")}>
        {pending ? "…" : "Send a test to me"}
      </Button>
      <Button size="sm" disabled={pending} onClick={() => fire("all")}>
        {pending ? "…" : "Send now"}
      </Button>
    </span>
  );
}

export function AddRecipientForm() {
  const [pending, start] = useTransition();
  return (
    <form
      id="rec-form"
      action={(fd) =>
        start(async () => {
          const r = await addRecipientAction(fd);
          if (!r.ok) toast.error(r.error);
          else {
            toast.success("Recipient added.");
            (document.getElementById("rec-form") as HTMLFormElement | null)?.reset();
          }
        })
      }
      className="flex flex-wrap items-end gap-2"
    >
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="rec-email">Email</Label>
        <Input id="rec-email" name="email" type="email" required placeholder="cfo@acme.example" />
      </div>
      <div className="flex-1 min-w-[160px]">
        <Label htmlFor="rec-name">Name (optional)</Label>
        <Input id="rec-name" name="name" />
      </div>
      <Button size="sm" type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add recipient"}
      </Button>
    </form>
  );
}

export function RemoveRecipientButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(() => removeRecipientAction(id))}>
      {pending ? "…" : "Remove"}
    </Button>
  );
}
