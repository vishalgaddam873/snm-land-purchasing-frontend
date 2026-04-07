"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { PaginatedTableShell } from "@/components/tables/paginated-table-shell";
import type { LandRecord, LandStatus } from "@/lib/data/types";
import { formatInr } from "@/lib/format";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { Pencil, Search, Trash2 } from "lucide-react";
import * as React from "react";

export function LandRecordsTable({ data }: { data: LandRecord[] }) {
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<LandStatus | "all">("all");

  const filtered = React.useMemo(() => {
    return data.filter((row) => {
      const hay = `${row.id} ${row.location} ${row.owner}`.toLowerCase();
      const okQ = hay.includes(q.trim().toLowerCase());
      const okS = status === "all" || row.status === status;
      return okQ && okS;
    });
  }, [data, q, status]);

  const {
    page,
    setPage,
    pageItems,
    pageCount,
    total: pageTotal,
    rangeFrom,
    rangeTo,
  } = useClientPagination(filtered, [q, status, data.length]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by land ID, location, or owner…"
            className="h-10 rounded-xl pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as LandStatus | "all")}
        >
          <SelectTrigger className="h-10 w-full rounded-xl sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
              <TableHead className="w-[110px]">Land ID</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">Area (acres)</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((row) => (
              <TableRow key={row.id} className="transition-colors">
                <TableCell>
                  <div className="inline-flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      className="rounded-xl"
                      aria-label={`Edit ${row.id}`}
                      onClick={() => undefined}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      className="rounded-xl"
                      aria-label={`Delete ${row.id}`}
                      onClick={() => undefined}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {row.id}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.location}
                </TableCell>
                <TableCell>{row.owner}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.areaAcres.toFixed(2)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatInr(row.priceInr)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
              </TableRow>
            ))}
            {pageTotal === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  No records match your filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </PaginatedTableShell>
    </div>
  );
}
