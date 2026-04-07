export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PaginatedList<T> = {
  data: T[];
  meta: PaginationMeta;
};

export function isPaginatedList<T>(raw: unknown): raw is PaginatedList<T> {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.data) || !o.meta || typeof o.meta !== "object")
    return false;
  const m = o.meta as Record<string, unknown>;
  return (
    typeof m.total === "number" &&
    typeof m.page === "number" &&
    typeof m.limit === "number" &&
    typeof m.totalPages === "number"
  );
}
