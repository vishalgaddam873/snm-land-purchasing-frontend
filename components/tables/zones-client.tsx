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
import type { DepartmentSelectOption } from "@/components/branches/department-searchable-select";
import type { Crumb } from "@/components/layout/page-header";
import { PageHeader } from "@/components/layout/page-header";
import {
  EMPTY_ZONE_LIST_FILTERS,
  ZonesFilterBar,
  type ZoneListFilterValues,
} from "@/components/zones/zones-filter-bar";
import { ZonesBulkExcelControls } from "@/components/zones/zones-bulk-excel-controls";
import { AppDataGrid } from "@/components/tables/app-data-grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { type GridColDef } from "@mui/x-data-grid";
import { isPaginatedList } from "@/lib/api/paginated-list";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/hooks/use-client-pagination";
import { cn } from "@/lib/utils";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import * as React from "react";

type PopulatedDept = { _id: string; name: string; code: string };

type DeptListRow = {
  _id: string;
  name: string;
  code: string;
  status?: string;
};

type ZoneRow = {
  _id: string;
  name: string;
  zoneCode?: string;
  zoneNumber: string;
  departmentId: PopulatedDept | string;
  status: "active" | "inactive" | "deleted";
};

type ZoneGridRow = ZoneRow & { id: string; departmentDisplay: string };

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

function filenameFromContentDisposition(cd: string | null): string | null {
  if (!cd) return null;
  const m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i.exec(
    cd,
  );
  if (!m) return null;
  const raw = (m[1] ?? m[2] ?? m[3] ?? "").trim();
  if (!raw) return null;
  try {
    return decodeURIComponent(raw.replace(/"/g, ""));
  } catch {
    return raw.replace(/"/g, "");
  }
}

function isUnfilteredZoneExport(
  search: string,
  fv: ZoneListFilterValues,
): boolean {
  if (search.trim()) return false;
  if (fv.departmentId.trim()) return false;
  if (fv.status) return false;
  return true;
}

/** Must stay ≤ backend `PaginationQueryDto` limit (Max 100). */
const DEPARTMENT_SELECT_PAGE_LIMIT = 100;

async function fetchDepartmentsForZones(): Promise<DepartmentSelectOption[]> {
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

export function ZonesClient({
  canManage,
  canExportExcel,
  title,
  description,
  crumbs,
}: {
  canManage: boolean;
  canExportExcel: boolean;
  title: string;
  description: string;
  crumbs: Crumb[];
}) {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<ZoneRow[]>([]);
  const [departments, setDepartments] = React.useState<DepartmentSelectOption[]>(
    [],
  );
  const [departmentsLoading, setDepartmentsLoading] = React.useState(true);
  const [departmentsFetchError, setDepartmentsFetchError] = React.useState<
    string | null
  >(null);
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [appliedFilters, setAppliedFilters] =
    React.useState<ZoneListFilterValues>(() => ({
      ...EMPTY_ZONE_LIST_FILTERS,
    }));
  const [error, setError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [edit, setEdit] = React.useState<ZoneRow | null>(null);
  const [zoneToDelete, setZoneToDelete] = React.useState<ZoneRow | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [exportLoading, setExportLoading] = React.useState(false);

  const [listPage, setListPage] = React.useState(1);
  const [listMeta, setListMeta] = React.useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);

  const fetchZonesPage = React.useCallback(
    async (page: number, search: string, fv: ZoneListFilterValues) => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          page: String(page),
          limit: String(DEFAULT_TABLE_PAGE_SIZE),
        });
        if (search) qs.set("search", search);
        if (fv.departmentId) qs.set("departmentId", fv.departmentId);
        if (fv.status) qs.set("status", fv.status);
        const res = await fetch(`/api/zones?${qs}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(
            Array.isArray(data?.message)
              ? data.message.join(", ")
              : data?.message ?? "Failed to load zones",
          );
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
    },
    [],
  );

  const handleExportZones = React.useCallback(async () => {
    setExportLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (debouncedSearch) qs.set("search", debouncedSearch);
      if (appliedFilters.departmentId) {
        qs.set("departmentId", appliedFilters.departmentId);
      }
      if (appliedFilters.status) qs.set("status", appliedFilters.status);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      const res = await fetch(`/api/zones/export${suffix}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const data: { message?: string | string[] } = await res
          .json()
          .catch(() => ({}));
        setError(
          Array.isArray(data?.message)
            ? data.message.join(", ")
            : typeof data?.message === "string"
              ? data.message
              : "Export failed",
        );
        return;
      }
      const blob = await res.blob();
      const fallback = isUnfilteredZoneExport(debouncedSearch, appliedFilters)
        ? "Master-Zones-Data.xlsx"
        : `zones-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      const name =
        filenameFromContentDisposition(
          res.headers.get("content-disposition"),
        ) ?? fallback;
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      a.click();
      URL.revokeObjectURL(href);
    } finally {
      setExportLoading(false);
    }
  }, [debouncedSearch, appliedFilters]);

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
    void fetchZonesPage(listPage, debouncedSearch, appliedFilters);
  }, [listPage, debouncedSearch, appliedFilters, fetchZonesPage]);

  React.useEffect(() => {
    void (async () => {
      setDepartmentsLoading(true);
      setDepartmentsFetchError(null);
      try {
        const list = await fetchDepartmentsForZones();
        setDepartments(list);
      } catch {
        setDepartments([]);
        setDepartmentsFetchError("Could not load departments.");
      } finally {
        setDepartmentsLoading(false);
      }
    })();
  }, []);

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
    const zoneCode = String(form.get("zoneCode") ?? "").trim();
    const zoneNumber = String(form.get("zoneNumber") ?? "").trim();
    const departmentId = String(form.get("departmentId") ?? "").trim();
    const status = String(form.get("status") ?? "active") as ZoneRow["status"];

    if (!name || !zoneNumber || !departmentId) {
      setFormError("Name, zone number, and department are required.");
      return;
    }

    const url = edit ? `/api/zones/${edit._id}` : "/api/zones";
    const method = edit ? "PATCH" : "POST";
    const body: Record<string, unknown> = {
      name,
      zoneNumber,
      departmentId,
      status,
    };
    if (edit) {
      body.zoneCode = zoneCode;
    } else if (zoneCode) {
      body.zoneCode = zoneCode;
    }

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
    await fetchZonesPage(listPage, debouncedSearch, appliedFilters);
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
      await fetchZonesPage(listPage, debouncedSearch, appliedFilters);
    } finally {
      setDeleteLoading(false);
    }
  }

  const pageTotal = listMeta?.total ?? 0;
  const shellPage = listMeta?.page ?? listPage;
  const limit = listMeta?.limit ?? DEFAULT_TABLE_PAGE_SIZE;

  const gridRows = React.useMemo<ZoneGridRow[]>(
    () =>
      rows.map((z) => ({
        ...z,
        id: z._id,
        departmentDisplay: departmentLabel(z),
      })),
    [rows],
  );

  const columns = React.useMemo<GridColDef<ZoneGridRow>[]>(() => {
    const cols: GridColDef<ZoneGridRow>[] = [];
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
              aria-label="Edit zone"
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
              aria-label="Delete zone"
              onClick={() => setZoneToDelete(params.row)}
            >
              <Trash2 className="size-4" />
            </IconButton>
          </Stack>
        ),
      });
    }
    cols.push(
      { field: "name", headerName: "Name", flex: 1, minWidth: 120 },
      {
        field: "zoneCode",
        headerName: "Zone code",
        width: 120,
        valueGetter: (_value, row) => row.zoneCode?.trim() || "—",
      },
      { field: "zoneNumber", headerName: "Number", width: 100 },
      {
        field: "departmentDisplay",
        headerName: "Department",
        flex: 0.85,
        minWidth: 140,
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
                    <Label htmlFor="zone-code">Zone code</Label>
                    <Input
                      id="zone-code"
                      name="zoneCode"
                      defaultValue={edit?.zoneCode ?? ""}
                      placeholder="Optional"
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
          ) : null
        }
      />

      <div className="space-y-4">
        <ZonesFilterBar
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
            setAppliedFilters({ ...EMPTY_ZONE_LIST_FILTERS });
            setListPage(1);
          }}
          departments={departments}
          departmentsLoading={departmentsLoading}
          departmentsFetchError={departmentsFetchError}
          toolbarAction={
            canManage ? (
              <div className="flex flex-wrap items-stretch justify-end gap-2">
                <ZonesBulkExcelControls
                  onImported={() => {
                    void fetchZonesPage(
                      listPage,
                      debouncedSearch,
                      appliedFilters,
                    );
                  }}
                />
                {canExportExcel ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 shrink-0 rounded-xl px-4"
                    disabled={exportLoading}
                    onClick={() => void handleExportZones()}
                  >
                    <Download className="mr-2 size-4 shrink-0" />
                    {exportLoading ? "Exporting…" : "Export Excel"}
                  </Button>
                ) : null}
              </div>
            ) : null
          }
        />

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
        noRowsLabel="No zones found."
      />
      </div>
    </div>
  );
}
