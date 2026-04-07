"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

type TablePaginationFooterProps = {
  page: number;
  pageCount: number;
  total: number;
  rangeFrom: number;
  rangeTo: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function TablePaginationFooter({
  page,
  pageCount,
  total,
  rangeFrom,
  rangeTo,
  onPageChange,
  className,
}: TablePaginationFooterProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-stretch justify-between gap-2 border-t border-border/80 bg-muted/20 px-3 py-2 sm:flex-row sm:items-center",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">
          {total === 0 ? 0 : rangeFrom}–{rangeTo}
        </span>{" "}
        of <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
          Prev
        </Button>
        <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
          Page {page} of {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
