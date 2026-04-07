"use client";

import { TablePaginationFooter } from "@/components/tables/table-pagination-footer";
import { cn } from "@/lib/utils";
import { PAGINATED_TABLE_MAX_HEIGHT_CLASS } from "@/hooks/use-client-pagination";
import * as React from "react";

type PaginatedTableShellProps = {
  children: React.ReactNode;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  pageCount: number;
  total: number;
  rangeFrom: number;
  rangeTo: number;
  /** Use inside a Card to avoid double border/shadow */
  embedInCard?: boolean;
  className?: string;
  scrollClassName?: string;
};

export function PaginatedTableShell({
  children,
  page,
  setPage,
  pageCount,
  total,
  rangeFrom,
  rangeTo,
  embedInCard,
  className,
  scrollClassName,
}: PaginatedTableShellProps) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm",
        PAGINATED_TABLE_MAX_HEIGHT_CLASS,
        embedInCard && "rounded-none border-0 bg-transparent shadow-none",
        className,
      )}
    >
      <div className={cn("min-h-0 flex-1 overflow-auto", scrollClassName)}>
        {children}
      </div>
      <TablePaginationFooter
        page={page}
        pageCount={pageCount}
        total={total}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        onPageChange={setPage}
      />
    </div>
  );
}
