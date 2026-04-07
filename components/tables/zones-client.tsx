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

type DeptOption = {
  _id: string;
  name: string;
  code: string;
  status?: string;
};

type PopulatedDept = { _id: string; name: string; code: string };

type ZoneRow = {
  _id: string;
  name: string;
  zoneNumber: string;
  departmentId: PopulatedDept | string;
  status: "active" | "inactive" | "deleted";
};

function departmentLabel(z: ZoneRow): string {
  const d = z.departmentId;
  if (d && typeof d === "object" && "name" in d) {
    return `${d.name} (${d.code})`;
  }
  return "—";
}

function departmentIdValue(z: ZoneRow): string {
  const d = z.departmentId;
  if (d && typeof d === "object" && "_id" in d) {
    return String(d._id);
  }
  return String(d ?? "");
}

const DEPARTMENT_SELECT_PAGE_LIMIT = 500;

export function ZonesClient({ canManage }: { canManage: boolean }) {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<ZoneRow[]>([]);
  const [departments, setDepartments] = React.useState<DeptOption[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [edit, setEdit] = React.useState<ZoneRow | null>(null);
  const [zoneToDelete, setZoneToDelete] = React.useState<ZoneRow | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const [listPage, setListPage] = React.useState(1);
  const [listMeta, setListMeta] = React.useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);

  const fetchZonesPage = React.useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(DEFAULT_TABLE_PAGE_SIZE),
      });
      const res = await fetch(`/api/zones?${qs}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? "Failed to load zones");
        setRows([]);
        setListMeta(null);
      } else if (isPaginatedList<ZoneRow>(data)) {
        setRows(data.data);
        setListMeta(data.meta);
        if (data.meta.page !== page) {
          setListPage(data.meta.page);
        }
      } else {
        setError("Invalid zones response");
        setRows([]);
        setListMeta(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchZonesPage(listPage);
  }, [listPage, fetchZonesPage]);

  React.useEffect(() => {
    if (!canManage) return;
    void (async () => {
      const qs = new URLSearchParams({
        page: "1",
        limit: String(DEPARTMENT_SELECT_PAGE_LIMIT),
      });
      const res = await fetch(`/api/publicity-departments?${qs}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && isPaginatedList<DeptOption>(data)) {
        setDepartments(
          data.data.filter(
            (d: DeptOption) => d.status !== "deleted",
          ) as DeptOption[],
        );
      }
    })();
  }, [canManage]);

  function closeForm() {
    setFormError(null);
    setOpen(false);
    setEdit(null);
  }

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const zoneNumber = String(form.get("zoneNumber") ?? "").trim();
    const departmentId = String(form.get("departmentId") ?? "").trim();
    const status = String(form.get("status") ?? "active") as ZoneRow["status"];

    if (!name || !zoneNumber || !departmentId) {
      setFormError("Name, zone number, and department are required.");
      return;
    }

    const url = edit ? `/api/zones/${edit._id}` : "/api/zones";
    const method = edit ? "PATCH" : "POST";
    const body = edit
      ? { name, zoneNumber, departmentId, status }
      : { name, zoneNumber, departmentId, status };

    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFormError(
        Array.isArray(data?.message)
          ? data.message.join(", ")
          : data?.message ?? "Save failed",
      );
      return;
    }

    closeForm();
    await fetchZonesPage(listPage);
  }

  async function confirmDelete() {
    if (!zoneToDelete) return;
    setError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/zones/${zoneToDelete._id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? "Delete failed");
        return;
      }
      setZoneToDelete(null);
      await fetchZonesPage(listPage);
    } finally {
      setDeleteLoading(false);
    }
  }

  const colCount = canManage ? 5 : 4;

  const pageTotal = listMeta?.total ?? 0;
  const shellPage = listMeta?.page ?? listPage;
  const limit = listMeta?.limit ?? DEFAULT_TABLE_PAGE_SIZE;
  const pageCount = listMeta?.totalPages ?? 1;
  const rangeFrom = pageTotal === 0 ? 0 : (shellPage - 1) * limit + 1;
  const rangeTo = Math.min(shellPage * limit, pageTotal);

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">All zones</h2>
            <p className="text-sm text-muted-foreground">
              Link each zone to a publicity department.
            </p>
          </div>

          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setEdit(null);
              else setFormError(null);
            }}
          >
            <DialogTrigger
              render={
                <Button
                  className="rounded-xl shadow-sm"
                  type="button"
                  onClick={() => setEdit(null)}
                />
              }
            >
              <Plus className="size-4" />
              Add zone
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>{edit ? "Edit zone" : "Add zone"}</DialogTitle>
                <DialogDescription>
                  Zone number is not auto-generated (e.g. 1, 1A, 2).
                </DialogDescription>
              </DialogHeader>
              <form
                key={edit?._id ?? "create"}
                className="space-y-4"
                onSubmit={onSave}
              >
                <div className="space-y-2">
                  <Label htmlFor="zone-name">Zone Name</Label>
                  <Input
                    id="zone-name"
                    name="name"
                    required
                    defaultValue={edit?.name ?? ""}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zoneNumber">Zone Number</Label>
                  <Input
                    id="zoneNumber"
                    name="zoneNumber"
                    required
                    defaultValue={edit?.zoneNumber ?? ""}
                    placeholder="e.g. 1, 1A, 2"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departmentId">Department</Label>
                  <select
                    id="departmentId"
                    name="departmentId"
                    required
                    defaultValue={
                      edit ? departmentIdValue(edit) : undefined
                    }
                    className={cn(
                      "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm",
                    )}
                  >
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zone-status">Status</Label>
                  <select
                    id="zone-status"
                    name="status"
                    defaultValue={edit?.status ?? "active"}
                    className={cn(
                      "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm",
                    )}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="deleted">Deleted</option>
                  </select>
                </div>
                {formError ? (
                  <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {formError}
                  </p>
                ) : null}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={closeForm}
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
      ) : (
        <div>
          <h2 className="text-lg font-semibold text-foreground">All zones</h2>
          <p className="text-sm text-muted-foreground">
            Read-only list. Superadmins can add and edit zones.
          </p>
        </div>
      )}

      {canManage ? (
        <Dialog
          open={zoneToDelete !== null}
          onOpenChange={(next) => {
            if (!next) setZoneToDelete(null);
          }}
        >
          <DialogContent
            className="max-w-md rounded-2xl"
            showCloseButton={!deleteLoading}
          >
            <DialogHeader>
              <DialogTitle>Delete zone?</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove{" "}
                <span className="font-medium text-foreground">
                  {zoneToDelete?.name}
                </span>
                ? It will be marked as deleted.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={deleteLoading}
                onClick={() => setZoneToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="rounded-xl"
                disabled={deleteLoading}
                onClick={() => void confirmDelete()}
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-2">
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
                {canManage ? (
                  <TableHead className="w-[100px]">Actions</TableHead>
                ) : null}
                <TableHead>Name</TableHead>
                <TableHead className="w-[120px]">Number</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((z) => (
                <TableRow key={z._id}>
                  {canManage ? (
                    <TableCell>
                      <div className="inline-flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => {
                            setEdit(z);
                            setOpen(true);
                          }}
                          aria-label="Edit zone"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setZoneToDelete(z)}
                          aria-label="Delete zone"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                  <TableCell className="font-medium">{z.name}</TableCell>
                  <TableCell>{z.zoneNumber}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {departmentLabel(z)}
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {z.status}
                  </TableCell>
                </TableRow>
              ))}
              {pageTotal === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colCount}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    No zones found.
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
