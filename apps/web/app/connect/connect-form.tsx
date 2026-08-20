"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { saveConnectionAction, startIngestionAction, testConnectionAction } from "./actions";

type Props = {
  initial: {
    host: string;
    clientId: string;
    warehouseId: string | null;
    hasSecret: boolean;
  };
};

export function ConnectForm({ initial }: Props) {
  const [saving, startSave] = useTransition();
  const [testing, startTest] = useTransition();
  const [ingesting, startIngest] = useTransition();

  async function onSave(fd: FormData) {
    startSave(async () => {
      const r = await saveConnectionAction(fd);
      if (r.ok) toast.success("Saved.");
      else toast.error(r.error);
    });
  }

  return (
    <form action={onSave} className="grid gap-3.5 max-w-[640px]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <Field
          label="Workspace host"
          name="host"
          defaultValue={initial.host}
          placeholder="adb-0000000000000000.0.azuredatabricks.net"
        />
        <Field
          label="Client ID"
          name="clientId"
          defaultValue={initial.clientId}
          placeholder="00000000-0000-0000-0000-000000000000"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <Field
          label="Client secret"
          name="clientSecret"
          type="password"
          placeholder={initial.hasSecret ? "•••••••• (leave blank to keep)" : "OAuth client secret"}
          required={!initial.hasSecret}
        />
        <Field
          label="Warehouse ID"
          name="warehouseId"
          defaultValue={initial.warehouseId ?? ""}
          placeholder="Optional"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save connection"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={testing || !initial.hasSecret}
          onClick={() =>
            startTest(async () => {
              const r = await testConnectionAction();
              if (r.ok) toast.success(r.message);
              else toast.error(r.message);
            })
          }
        >
          {testing ? "Testing…" : "Test the connection"}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={ingesting}
          onClick={() =>
            startIngest(async () => {
              const r = await startIngestionAction(30);
              if (r.ok) toast.success(r.message);
              else toast.error(r.message);
            })
          }
        >
          {ingesting ? "Ingesting…" : "Start ingestion (30 d)"}
        </Button>
      </div>
    </form>
  );
}

function Field(props: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={props.name}>{props.label}</Label>
      <Input
        id={props.name}
        name={props.name}
        type={props.type ?? "text"}
        defaultValue={props.defaultValue ?? ""}
        placeholder={props.placeholder}
        required={props.required}
        autoComplete="off"
      />
    </div>
  );
}
