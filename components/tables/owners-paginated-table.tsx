"use client";

import { PlaceholderEditDeleteRowActions } from "@/components/tables/placeholder-edit-delete-actions";
import { PaginatedTableShell } from "@/components/tables/paginated-table-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClientPagination } from "@/hooks/use-client-pagination";
import type { OwnerRecord } from "@/lib/data/types";

export function OwnersPaginatedTable({ data }: { data: OwnerRecord[] }) {
  const {
    page,
    setPage,
    pageItems,
    pageCount,
    total: pageTotal,
    rangeFrom,
    rangeTo,
  } = useClientPagination(data, [data]);

  return (
    <PaginatedTableShell
      page={page}
      setPage={setPage}
      pageCount={pageCount}
      total={pageTotal}
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[100px]">Actions</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead className="text-right">Lands</TableHead>
            <TableHead className="hidden md:table-cell">Region</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.map((o) => (
            <TableRow key={o.id}>
              <TableCell>
                <PlaceholderEditDeleteRowActions
                  editAriaLabel={`Edit owner ${o.id}`}
                  deleteAriaLabel={`Delete owner ${o.id}`}
                />
              </TableCell>
              <TableCell className="font-medium">{o.id}</TableCell>
              <TableCell>{o.name}</TableCell>
              <TableCell className="text-muted-foreground">{o.contact}</TableCell>
              <TableCell className="text-right tabular-nums">
                {o.landsCount}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {o.location}
              </TableCell>
            </TableRow>
          ))}
          {pageTotal === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                No owners found.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </PaginatedTableShell>
  );
}
