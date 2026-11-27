"use client";

import Link from "next/link";
import { getCoreRowModel, flexRender, useReactTable, type ColumnDef } from "@tanstack/react-table";

export type Cell = string | { text: string; href?: string; fullNavigation?: boolean; badge?: boolean; status?: string };

export function DataTable({ columns, rows, empty = "No records found." }: { columns: string[]; rows: Cell[][]; empty?: string }) {
  const definitions: ColumnDef<Cell[]>[] = columns.map((title, index) => ({
    id: String(index), header: title, accessorFn: row => row[index],
    cell: context => {
      const value = context.getValue<Cell>();
      if (typeof value === "string") return value;
      if (value.href) return value.fullNavigation ? <a href={value.href}>{value.text}</a> : <Link href={value.href}>{value.text}</Link>;
      return value.badge ? <span className="chip" data-status={value.status}>{value.text}</span> : value.text;
    },
  }));
  const table = useReactTable({ data: rows, columns: definitions, getCoreRowModel: getCoreRowModel() });
  if (!rows.length) return <p className="empty-state">{empty}</p>;
  return <div className="table-frame" tabIndex={0} role="region" aria-label="Results table">
    <table><thead>{table.getHeaderGroups().map(group => <tr key={group.id}>{group.headers.map(header =>
      <th key={header.id} scope="col">{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead>
      <tbody>{table.getRowModel().rows.map(row => <tr key={row.id}>{row.getVisibleCells().map(cell =>
        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}
