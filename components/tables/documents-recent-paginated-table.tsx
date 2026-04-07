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
import type { DocumentItem } from "@/lib/data/types";

export function DocumentsRecentPaginatedTable({
  data,
  embedInCard,
}: {
  data: DocumentItem[];
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
            <TableHead>Document</TableHead>
            <TableHead>Land</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="hidden sm:table-cell">Size</TableHead>
            <TableHead className="text-right">Uploaded</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.map((d) => (
            <TableRow key={d.id}>
              <TableCell>
                <PlaceholderEditDeleteRowActions
                  editAriaLabel={`Edit ${d.name}`}
                  deleteAriaLabel={`Delete ${d.name}`}
                />
              </TableCell>
              <TableCell className="max-w-[200px] truncate font-medium">
                {d.name}
              </TableCell>
              <TableCell>{d.landId}</TableCell>
              <TableCell className="text-muted-foreground">{d.type}</TableCell>
              <TableCell className="hidden tabular-nums text-muted-foreground sm:table-cell">
                {d.sizeKb} KB
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">
                {d.uploadedAt}
              </TableCell>
            </TableRow>
          ))}
          {pageTotal === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                No documents found.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </PaginatedTableShell>
  );
}
