"use client";

import * as React from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import type { Basis, Currency } from "@tare/core";
import { Money } from "./money";
import { BasisPill, Pill } from "./pills";
import { Badge } from "./ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "./ui/table";

export type LedgerRow = {
  id: string;
  usageDate: string;
  entity: string;
  kind: string;
  sku: string;
  dbus: number;
  costMinor: number;
  costBasis: Basis;
  currency: Currency;
  ownerName: string | null;
};

export function LedgerTable({ rows }: { rows: readonly LedgerRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "usageDate", desc: true },
  ]);

  const columns = React.useMemo<ColumnDef<LedgerRow>[]>(
    () => [
      {
        accessorKey: "usageDate",
        header: "Date",
        cell: ({ getValue }) => {
          const d = new Date(`${getValue<string>()}T00:00:00Z`);
          return (
            <span className="font-mono text-[13px] text-muted">
              {d.toLocaleDateString("en-IE", { day: "2-digit", month: "short" })}
            </span>
          );
        },
      },
      {
        accessorKey: "entity",
        header: "Entity",
        cell: ({ getValue }) => (
          <Link
            href={`/workload/${encodeURIComponent(getValue<string>())}` as never}
            className="font-medium hover:underline"
          >
            {getValue<string>()}
          </Link>
        ),
      },
      {
        accessorKey: "kind",
        header: "Kind",
        cell: ({ getValue }) => <span className="text-muted text-[13px]">{getValue<string>()}</span>,
      },
      {
        accessorKey: "sku",
        header: "SKU",
        cell: ({ getValue }) => {
          const sku = getValue<string>();
          const serverless = /^\s*SERVERLESS[_ ]/i.test(sku);
          return (
            <span className="font-mono text-[13px] text-muted inline-flex items-center gap-2">
              {sku}
              {serverless ? <Badge variant="ink">serverless</Badge> : null}
            </span>
          );
        },
      },
      {
        accessorKey: "ownerName",
        header: "Owner",
        cell: ({ getValue }) => {
          const v = getValue<string | null>();
          return v ?? <Pill variant="ovr">unassigned</Pill>;
        },
      },
      {
        accessorKey: "dbus",
        header: () => <span className="block text-right">DBUs</span>,
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums block text-right">{Number(getValue<number>()).toFixed(1)}</span>
        ),
      },
      {
        accessorKey: "costMinor",
        header: () => <span className="block text-right">Cost</span>,
        cell: ({ row }) => (
          <span className="block text-right">
            <Money amount={row.original.costMinor} basis={row.original.costBasis} currency={row.original.currency} />
          </span>
        ),
      },
      {
        accessorKey: "costBasis",
        header: "Basis",
        cell: ({ getValue }) => <BasisPill basis={getValue<Basis>()} />,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows as LedgerRow[],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (rows.length === 0) {
    return <div className="px-4 py-6 text-muted">No usage rows for those filters.</div>;
  }

  return (
    <Table>
      <THead>
        {table.getHeaderGroups().map((hg) => (
          <TR key={hg.id}>
            {hg.headers.map((h) => {
              const sorted = h.column.getIsSorted();
              const canSort = h.column.getCanSort();
              return (
                <TH
                  key={h.id}
                  onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                  className={canSort ? "cursor-pointer select-none hover:text-ink" : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {canSort ? (
                      sorted === "asc" ? <ChevronUp className="h-3 w-3" />
                      : sorted === "desc" ? <ChevronDown className="h-3 w-3" />
                      : <ChevronsUpDown className="h-3 w-3 opacity-40" />
                    ) : null}
                  </span>
                </TH>
              );
            })}
          </TR>
        ))}
      </THead>
      <TBody>
        {table.getRowModel().rows.map((r) => (
          <TR key={r.id}>
            {r.getVisibleCells().map((c) => (
              <TD key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TD>
            ))}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
