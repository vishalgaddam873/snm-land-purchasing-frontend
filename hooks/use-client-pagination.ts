"use client";

import * as React from "react";

export const DEFAULT_TABLE_PAGE_SIZE = 10;

/** Max height for scroll area: ~10 rows + header without overflowing typical viewports */
export const PAGINATED_TABLE_MAX_HEIGHT_CLASS =
  "max-h-[min(62vh,30rem)]";

/**
 * Client-side slice of `items` (10 per page by default). Resets to page 1 when `resetDeps` change.
 * Clamps the current page when the list shrinks.
 */
export function useClientPagination<T>(
  items: T[],
  resetDeps: React.DependencyList = [],
  pageSize: number = DEFAULT_TABLE_PAGE_SIZE,
) {
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setPage(1);
    // Caller controls when the list context changes (filter, refetch, etc.).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);

  React.useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  const rangeFrom = total === 0 ? 0 : start + 1;
  const rangeTo = Math.min(start + pageSize, total);

  return {
    page: safePage,
    setPage,
    pageItems,
    pageCount,
    total,
    rangeFrom,
    rangeTo,
    pageSize,
  };
}
