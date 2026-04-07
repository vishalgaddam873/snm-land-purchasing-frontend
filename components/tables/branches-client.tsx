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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type ZoneOption = {
  _id: string;
  name: string;
  zoneNumber: string;
  status?: string;
};

type PopulatedZone = { _id: string; name: string; zoneNumber: string };

type BranchRow = {
  _id: string;
  name: string;
  zoneId: PopulatedZone | string;
  status: "active" | "inactive" | "deleted";
};

function zoneLabel(z: BranchRow): string {
  const zone = z.zoneId;
  if (zone && typeof zone === "object" && "name" in zone) {
    return `${zone.name} (${zone.zoneNumber})`;
  }
  return "—";
}

function zoneIdValue(b: BranchRow): string {
  const zone = b.zoneId;
  if (zone && typeof zone === "object" && "_id" in zone) {
    return String(zone._id);
  }
  return String(zone ?? "");
}

function zoneOptionId(z: ZoneOption): string {
  if (z._id != null && z._id !== "") {
    return String(z._id);
  }
  return "";
}

function compareZoneNumbers(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function sortZonesForSelect(zones: ZoneOption[]): ZoneOption[] {
  return [...zones].sort((x, y) =>
    compareZoneNumbers(x.zoneNumber ?? "", y.zoneNumber ?? ""),
  );
}

const FILTER_ALL_ZONES = "__all_zones__";

async function fetchAllActiveZonesForSelect(): Promise<ZoneOption[]> {
  const res = await fetch("/api/zones/active", { cache: "no-store" });
  if (!res.ok) {
    return [];
  }
  const data = await res.json().catch(() => []);
  if (!Array.isArray(data)) {
    return [];
  }
  return data as ZoneOption[];
}

export function BranchesClient({ canManage }: { canManage: boolean }) {
  const [loading, setLoading] = React.useState(true);
  const [zonesLoading, setZonesLoading] = React.useState(true);
  const [rows, setRows] = React.useState<BranchRow[]>([]);
  const [zones, setZones] = React.useState<ZoneOption[]>([]);
  const [filterZoneId, setFilterZoneId] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [zonesFetchError, setZonesFetchError] = React.useState<string | null>(
    null,
  );
  const [dialogZoneId, setDialogZoneId] = React.useState("");

  const [open, setOpen] = React.useState(false);
  const [edit, setEdit] = React.useState<BranchRow | null>(null);
  const [branchToDelete, setBranchToDelete] =
    React.useState<BranchRow | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const [listPage, setListPage] = React.useState(1);
  const [listMeta, setListMeta] = React.useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);

  const sortedZones = React.useMemo(() => sortZonesForSelect(zones), [zones]);

  const fetchBranchesPage = React.useCallback(
    async (zoneFilter: string, page: number) => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          page: String(page),
          limit: String(DEFAULT_TABLE_PAGE_SIZE),
        });
        if (zoneFilter) qs.set("zoneId", zoneFilter);
        const res = await fetch(`/api/branches?${qs}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.message ?? "Failed to load branches");
          setRows([]);
          setListMeta(null);
        } else if (isPaginatedList<BranchRow>(data)) {
          setRows(data.data);
          setListMeta(data.meta);
          if (data.meta.page !== page) {
            setListPage(data.meta.page);
          }
        } else {
          setError("Invalid branches response");
          setRows([]);
          setListMeta(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    void fetchBranchesPage(filterZoneId, listPage);
  }, [filterZoneId, listPage, fetchBranchesPage]);

  React.useEffect(() => {
    void (async () => {
      setZonesLoading(true);
      setZonesFetchError(null);
      try {
        const list = await fetchAllActiveZonesForSelect();
        setZones(list);
      } catch {
        setZones([]);
        setZonesFetchError("Could not load zones.");
      } finally {
        setZonesLoading(false);
      }
    })();
  }, []);

  React.useEffect(() => {
    if (open) {
      setDialogZoneId(edit ? zoneIdValue(edit) : "");
    }
  }, [open, edit]);

  function closeForm() {
    setFormError(null);
    setOpen(false);
    setEdit(null);
    setDialogZoneId("");
  }

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const zoneId = dialogZoneId.trim();
    const status = String(form.get("status") ?? "active") as BranchRow["status"];

    if (!name || !zoneId) {
      setFormError("Branch name and zone are required.");
      return;
    }

    const url = edit ? `/api/branches/${edit._id}` : "/api/branches";
    const method = edit ? "PATCH" : "POST";
    const body = { name, zoneId, status };

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
    await fetchBranchesPage(filterZoneId, listPage);
  }

  async function confirmDelete() {
    if (!branchToDelete) return;
    setError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/branches/${branchToDelete._id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? "Delete failed");
        return;
      }
      setBranchToDelete(null);
      await fetchBranchesPage(filterZoneId, listPage);
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
      <div
        className={cn(
          "flex flex-col gap-4",
          canManage
            ? "sm:flex-row sm:items-start sm:justify-between"
            : "sm:flex-row sm:items-end sm:justify-between",
        )}
      >
        <div className="flex flex-col gap-2 sm:max-w-xs">
          <Label htmlFor="branch-zone-filter">Filter by zone</Label>
          <Select
            value={filterZoneId ? filterZoneId : FILTER_ALL_ZONES}
            disabled={zonesLoading}
            onValueChange={(v) => {
              const next =
                v == null || v === FILTER_ALL_ZONES ? "" : v;
              setFilterZoneId(next);
              setListPage(1);
            }}
          >
            <SelectTrigger
              id="branch-zone-filter"
              className="h-10 w-full rounded-xl"
            >
              <SelectValue placeholder={zonesLoading ? "Loading zones…" : "All zones"}>
                {filterZoneId
                  ? (() => {
                      const zone = sortedZones.find((z) => zoneOptionId(z) === filterZoneId);
                      return zone ? `${zone.name} (${zone.zoneNumber})` : "All zones";
                    })()
                  : "All zones"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={FILTER_ALL_ZONES}>All zones</SelectItem>
              {sortedZones.map((z) => {
                const id = zoneOptionId(z);
                if (!id) return null;
                return (
                  <SelectItem key={id} value={id}>
                    {z.name} ({z.zoneNumber})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {zonesFetchError ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {zonesFetchError}
            </p>
          ) : null}
        </div>

        {canManage ? (
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="text-right sm:text-right">
              <h2 className="text-lg font-semibold text-foreground">
                All branches
              </h2>
              <p className="text-sm text-muted-foreground">
                Each branch belongs to one zone.
              </p>
            </div>

            <Dialog
              open={open}
              onOpenChange={(next) => {
                setOpen(next);
                if (!next) {
                  setEdit(null);
                  setDialogZoneId("");
                } else {
                  setFormError(null);
                }
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
                Add branch
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>{edit ? "Edit branch" : "Add branch"}</DialogTitle>
                  <DialogDescription>
                    Choose the zone this branch sits under.
                  </DialogDescription>
                </DialogHeader>
                <form
                  key={edit?._id ?? "create"}
                  className="space-y-4"
                  onSubmit={onSave}
                >
                  <div className="space-y-2">
                    <Label htmlFor="branch-name">Branch name</Label>
                    <Input
                      id="branch-name"
                      name="name"
                      required
                      defaultValue={edit?.name ?? ""}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch-zoneId">Zone</Label>
                    <Select
                      value={dialogZoneId || undefined}
                      onValueChange={(v) => setDialogZoneId(v ?? "")}
                    >
                      <SelectTrigger
                        id="branch-zoneId"
                        className="h-10 w-full rounded-xl"
                      >
                        <SelectValue placeholder="Select zone" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {sortedZones.map((z) => {
                          const id = zoneOptionId(z);
                          if (!id) return null;
                          return (
                            <SelectItem key={id} value={id}>
                              {z.name} ({z.zoneNumber})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch-status">Status</Label>
                    <select
                      id="branch-status"
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
            <h2 className="text-lg font-semibold text-foreground">
              All branches
            </h2>
            <p className="text-sm text-muted-foreground">
              Read-only list. Superadmins can add and edit branches.
            </p>
          </div>
        )}
      </div>

      {canManage ? (
        <Dialog
          open={branchToDelete !== null}
          onOpenChange={(next) => {
            if (!next) setBranchToDelete(null);
          }}
        >
          <DialogContent
            className="max-w-md rounded-2xl"
            showCloseButton={!deleteLoading}
          >
            <DialogHeader>
              <DialogTitle>Delete branch?</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove{" "}
                <span className="font-medium text-foreground">
                  {branchToDelete?.name}
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
                onClick={() => setBranchToDelete(null)}
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
                <TableHead>Branch name</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b._id}>
                  {canManage ? (
                    <TableCell>
                      <div className="inline-flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => {
                            setEdit(b);
                            setOpen(true);
                          }}
                          aria-label="Edit branch"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setBranchToDelete(b)}
                          aria-label="Delete branch"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {zoneLabel(b)}
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {b.status}
                  </TableCell>
                </TableRow>
              ))}
              {pageTotal === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colCount}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    No branches found.
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
