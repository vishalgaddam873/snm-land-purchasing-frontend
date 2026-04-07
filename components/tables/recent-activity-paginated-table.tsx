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
import type { ActivityItem } from "@/lib/data/types";

export function RecentActivityPaginatedTable({
  data,
  embedInCard,
}: {
  data: ActivityItem[];
  embedInCard?: boolean;
}) {
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
      embedInCard={embedInCard}
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[100px]">Actions</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Detail</TableHead>
            <TableHead className="hidden md:table-cell">By</TableHead>
            <TableHead className="text-right">When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <PlaceholderEditDeleteRowActions
                  editAriaLabel="Edit entry"
                  deleteAriaLabel="Delete entry"
                />
              </TableCell>
              <TableCell className="font-medium">{row.action}</TableCell>
              <TableCell className="max-w-md text-muted-foreground">
                {row.detail}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {row.actor}
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">
                {row.at}
              </TableCell>
            </TableRow>
          ))}
          {pageTotal === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                No activity yet.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </PaginatedTableShell>
  );
}
