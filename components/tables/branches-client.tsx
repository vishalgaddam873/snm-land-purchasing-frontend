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
import {
  BranchesFilterBar,
  EMPTY_BRANCH_LIST_FILTERS,
  type BranchListFilterValues,
} from "@/components/branches/branches-filter-bar";
import type { DepartmentSelectOption } from "@/components/branches/department-searchable-select";
import type { ZoneSelectOption } from "@/components/branches/zone-searchable-select";
import type { Crumb } from "@/components/layout/page-header";
import { PageHeader } from "@/components/layout/page-header";
import { AppDataGrid } from "@/components/tables/app-data-grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { type GridColDef } from "@mui/x-data-grid";
import { isPaginatedList } from "@/lib/api/paginated-list";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/hooks/use-client-pagination";
import { cn } from "@/lib/utils";
import { Pencil, Plus, Trash2 } from "lucide-react";
import * as React from "react";

type PopulatedDepartment = { _id: string; name: string; code: string };

type PopulatedZone = {
  _id: string;
  name: string;
  zoneNumber: string;
  departmentId?: PopulatedDepartment | string;
};

type BranchRow = {
  _id: string;
  name: string;
  zoneId: PopulatedZone | string;
  status: "active" | "inactive" | "deleted";
};

type BranchGridRow = BranchRow & {
  id: string;
  zoneDisplay: string;
  departmentDisplay: string;
};

function zoneLabel(z: BranchRow): string {
  const zone = z.zoneId;
  if (zone && typeof zone === "object" && "name" in zone) {
    return `${zone.name} (${zone.zoneNumber})`;
  }
  return "—";
}

function departmentLabel(b: BranchRow): string {
  const zone = b.zoneId;
  if (!zone || typeof zone !== "object" || !("departmentId" in zone)) {
    return "—";
  }
  const d = zone.departmentId;
  if (d && typeof d === "object" && "name" in d) {
    return `${d.name} (${d.code})`;
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

function zoneOptionId(z: ZoneSelectOption): string {
  if (z._id != null && z._id !== "") {
    return String(z._id);
  }
  return "";
}

function compareZoneNumbers(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function sortZonesForSelect(zones: ZoneSelectOption[]): ZoneSelectOption[] {
  return [...zones].sort((x, y) =>
    compareZoneNumbers(x.zoneNumber ?? "", y.zoneNumber ?? ""),
  );
}

async function fetchAllActiveZonesForSelect(): Promise<ZoneSelectOption[]> {
  const res = await fetch("/api/zones/active", { cache: "no-store" });
  if (!res.ok) {
    return [];
  }
  const data = await res.json().catch(() => []);
  if (!Array.isArray(data)) {
    return [];
  }
  return data as ZoneSelectOption[];
}

const DEPARTMENT_SELECT_PAGE_LIMIT = 500;

type DeptListRow = {
  _id: string;
  name: string;
  code: string;
  status?: string;
};

async function fetchDepartmentsForSelect(): Promise<DepartmentSelectOption[]> {
  const qs = new URLSearchParams({
    page: "1",
    limit: String(DEPARTMENT_SELECT_PAGE_LIMIT),
  });
  const res = await fetch(`/api/publicity-departments?${qs}`, {
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !isPaginatedList<DeptListRow>(data)) {
    return [];
  }
  return data.data
    .filter((d) => d.status !== "deleted")
    .map((d) => ({
      _id: d._id,
      name: d.name,
      code: d.code,
    }));
}

export function BranchesClient({
  canManage,
  title,
  description,
  crumbs,
}: {
  canManage: boolean;
  title: string;
  description: string;
  crumbs: Crumb[];
}) {
  const [loading, setLoading] = React.useState(true);
  const [zonesLoading, setZonesLoading] = React.useState(true);
  const [departmentsLoading, setDepartmentsLoading] = React.useState(true);
  const [rows, setRows] = React.useState<BranchRow[]>([]);
  const [zones, setZones] = React.useState<ZoneSelectOption[]>([]);
  const [departments, setDepartments] = React.useState<DepartmentSelectOption[]>(
    [],
  );
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [appliedFilters, setAppliedFilters] =
    React.useState<BranchListFilterValues>(() => ({
      ...EMPTY_BRANCH_LIST_FILTERS,
    }));
  const [error, setError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [zonesFetchError, setZonesFetchError] = React.useState<string | null>(
    null,
  );
  const [departmentsFetchError, setDepartmentsFetchError] = React.useState<
    string | null
  >(null);
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
    async (
      page: number,
      search: string,
      fv: BranchListFilterValues,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          page: String(page),
          limit: String(DEFAULT_TABLE_PAGE_SIZE),
        });
        if (search) qs.set("search", search);
        if (fv.departmentId) qs.set("departmentId", fv.departmentId);
        if (fv.zoneId) qs.set("zoneId", fv.zoneId);
        if (fv.status) qs.set("status", fv.status);
        const res = await fetch(`/api/branches?${qs}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(
            Array.isArray(data?.message)
              ? data.message.join(", ")
              : data?.message ?? "Failed to load branches",
          );
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

  const skipSearchPageReset = React.useRef(true);
  React.useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 400);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  React.useEffect(() => {
    if (skipSearchPageReset.current) {
      skipSearchPageReset.current = false;
      return;
    }
    setListPage(1);
  }, [debouncedSearch]);

  React.useEffect(() => {
    void fetchBranchesPage(listPage, debouncedSearch, appliedFilters);
  }, [listPage, debouncedSearch, appliedFilters, fetchBranchesPage]);

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
    void (async () => {
      setDepartmentsLoading(true);
      setDepartmentsFetchError(null);
      try {
        const list = await fetchDepartmentsForSelect();
        setDepartments(list);
      } catch {
        setDepartments([]);
        setDepartmentsFetchError("Could not load departments.");
      } finally {
        setDepartmentsLoading(false);
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
    await fetchBranchesPage(listPage, debouncedSearch, appliedFilters);
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
      await fetchBranchesPage(listPage, debouncedSearch, appliedFilters);
    } finally {
      setDeleteLoading(false);
    }
  }

  const pageTotal = listMeta?.total ?? 0;
  const shellPage = listMeta?.page ?? listPage;
  const limit = listMeta?.limit ?? DEFAULT_TABLE_PAGE_SIZE;

  const gridRows = React.useMemo<BranchGridRow[]>(
    () =>
      rows.map((b) => ({
        ...b,
        id: b._id,
        zoneDisplay: zoneLabel(b),
        departmentDisplay: departmentLabel(b),
      })),
    [rows],
  );

  const columns = React.useMemo<GridColDef<BranchGridRow>[]>(() => {
    const cols: GridColDef<BranchGridRow>[] = [];
    if (canManage) {
      cols.push({
        field: "actions",
        headerName: "Actions",
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        width: 104,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <Stack direction="row" spacing={0.25} justifyContent="center">
            <IconButton
              size="small"
              aria-label="Edit branch"
              onClick={() => {
                setEdit(params.row);
                setOpen(true);
              }}
            >
              <Pencil className="size-4" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              aria-label="Delete branch"
              onClick={() => setBranchToDelete(params.row)}
            >
              <Trash2 className="size-4" />
            </IconButton>
          </Stack>
        ),
      });
    }
    cols.push(
      { field: "name", headerName: "Branch name", flex: 1, minWidth: 140 },
      {
        field: "zoneDisplay",
        headerName: "Zone",
        flex: 0.85,
        minWidth: 140,
      },
      {
        field: "departmentDisplay",
        headerName: "Department",
        flex: 0.75,
        minWidth: 132,
      },
      {
        field: "status",
        headerName: "Status",
        width: 110,
        renderCell: (params) => (
          <span className="capitalize">{String(params.value ?? "")}</span>
        ),
      },
    );
    return cols;
  }, [canManage]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        description={description}
        crumbs={crumbs}
        actionsBesideTitle={canManage}
        actions={
          canManage ? (
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
          ) : null
        }
      />

      <div className="space-y-4">
        <BranchesFilterBar
          search={searchInput}
          onSearchChange={setSearchInput}
          appliedFilters={appliedFilters}
          onApplyFilters={(next) => {
            setAppliedFilters(next);
            setListPage(1);
          }}
          onClearAll={() => {
            setSearchInput("");
            setDebouncedSearch("");
            setAppliedFilters({ ...EMPTY_BRANCH_LIST_FILTERS });
            setListPage(1);
          }}
          departments={departments}
          departmentsLoading={departmentsLoading}
          departmentsFetchError={departmentsFetchError}
          zones={zones}
          zonesLoading={zonesLoading}
          zonesFetchError={zonesFetchError}
        />

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

      <AppDataGrid
        rows={gridRows}
        columns={columns}
        loading={loading}
        rowCount={pageTotal}
        paginationModel={{
          page: Math.max(0, shellPage - 1),
          pageSize: limit,
        }}
        onPaginationModelChange={(model) => {
          setListPage(model.page + 1);
        }}
        noRowsLabel="No branches found."
      />
      </div>
    </div>
  );
}
