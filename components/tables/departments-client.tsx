"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginatedTableShell } from "@/components/tables/paginated-table-shell";
import { isPaginatedList } from "@/lib/api/paginated-list";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/hooks/use-client-pagination";
import { cn } from "@/lib/utils";
import { Pencil, Plus, Trash2 } from "lucide-react";
import * as React from "react";

type Dept = {
  _id: string;
  name: string;
  code: string;
  status: "active" | "inactive" | "deleted";
};

export function DepartmentsClient() {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<Dept[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [edit, setEdit] = React.useState<Dept | null>(null);

  const [listPage, setListPage] = React.useState(1);
  const [listMeta, setListMeta] = React.useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);

  const fetchPage = React.useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(DEFAULT_TABLE_PAGE_SIZE),
      });
      const res = await fetch(`/api/publicity-departments?${qs}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? "Failed to load departments");
        setRows([]);
        setListMeta(null);
      } else if (isPaginatedList<Dept>(data)) {
        setRows(data.data);
        setListMeta(data.meta);
        if (data.meta.page !== page) {
          setListPage(data.meta.page);
        }
      } else {
        setError("Invalid departments response");
        setRows([]);
        setListMeta(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchPage(listPage);
  }, [listPage, fetchPage]);

  async function onCreateOrUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const status = String(form.get("status") ?? "active") as Dept["status"];
    if (!name) return;

    const res = await fetch(
      edit ? `/api/publicity-departments/${edit._id}` : "/api/publicity-departments",
      {
        method: edit ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, status }),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.message ?? "Save failed");
      return;
    }

    setOpen(false);
    setEdit(null);
    await fetchPage(listPage);
  }

  async function onDelete(id: string) {
    const res = await fetch(`/api/publicity-departments/${id}`, {
      method: "DELETE",
    });
    if (res.ok) await fetchPage(listPage);
  }

  const pageTotal = listMeta?.total ?? 0;
  const shellPage = listMeta?.page ?? listPage;
  const limit = listMeta?.limit ?? DEFAULT_TABLE_PAGE_SIZE;
  const pageCount = listMeta?.totalPages ?? 1;
  const rangeFrom = pageTotal === 0 ? 0 : (shellPage - 1) * limit + 1;
  const rangeTo = Math.min(shellPage * limit, pageTotal);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Publicity departments</h2>
          <p className="text-sm text-muted-foreground">
            Codes are generated automatically (DEP-001, DEP-002…).
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button className="rounded-xl shadow-sm" type="button" />
            }
          >
            <Plus className="size-4" />
            Add department
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>{edit ? "Edit department" : "Add department"}</DialogTitle>
              <DialogDescription>
                Keep names clear and consistent for reporting.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={onCreateOrUpdate}>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={edit?.name ?? ""}
                  placeholder="e.g. North Publicity"
                  className="h-10 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={edit?.status ?? "active"}
                  className={cn(
                    "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm",
                  )}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              {error ? (
                <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setOpen(false);
                    setEdit(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="rounded-xl shadow-sm">
                  Save
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      ) : (
        <PaginatedTableShell
          page={shellPage}
          setPage={setListPage}
          pageCount={pageCount}
          total={pageTotal}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[100px]">Actions</TableHead>
                <TableHead className="w-[120px]">Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d._id}>
                  <TableCell>
                    <div className="inline-flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => {
                          setEdit(d);
                          setOpen(true);
                        }}
                        aria-label="Edit"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => onDelete(d._id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{d.code}</TableCell>
                  <TableCell>{d.name}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {d.status}
                  </TableCell>
                </TableRow>
              ))}
              {pageTotal === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    No departments found.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </PaginatedTableShell>
      )}
    </div>
  );
}

