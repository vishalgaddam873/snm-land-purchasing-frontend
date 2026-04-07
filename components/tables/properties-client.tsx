"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EMPTY_PROPERTY_LIST_FILTERS,
  PropertiesFilterBar,
  type PropertyListFilterValues,
} from "@/components/properties/properties-filter-bar";
import { AppDataGrid } from "@/components/tables/app-data-grid";
import type { DepartmentSelectOption } from "@/components/branches/department-searchable-select";
import type { ZoneSelectOption } from "@/components/branches/zone-searchable-select";
import {
  bhawanLabel,
  constructionLabel,
  fetchActiveZonesForSelect,
  fetchBranchesForSelect,
  labelFromSnake,
  propertyTypeLabel,
  registrationLabel,
  remarksPlainPreview,
  verifiedByLabel,
  zoneNameLabel,
  zoneNumberLabel,
  sectorNameLabel,
  branchNameOnly,
  type BranchOption,
  type PropertyRow,
} from "@/components/properties/property-helpers";
import { isPaginatedList } from "@/lib/api/paginated-list";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/hooks/use-client-pagination";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { type GridColDef } from "@mui/x-data-grid";
import { Download, Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";

const DEPARTMENT_SELECT_PAGE_LIMIT = 100;

type DeptListRow = {
  _id: string;
  name: string;
  code: string;
  status: string;
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

/** Row shape passed to MUI Data Grid (flat fields + `id`). */
type PropertyGridRow = PropertyRow & {
  id: string;
  zoneNo: string;
  zoneNameCol: string;
  sectorCol: string;
  branchNameCol: string;
  remarksText: string;
  bhawanDisplay: string;
  constructionDisplay: string;
  registrationDisplay: string;
  propertyTypeDisplay: string;
  verificationDisplay: string;
  verifiedByDisplay: string;
  statusDisplay: string;
};

function buildPropertiesExportQuery(
  search: string,
  fv: PropertyListFilterValues,
): string {
  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  if (fv.departmentId) qs.set("departmentId", fv.departmentId);
  if (fv.zoneId) qs.set("zoneId", fv.zoneId);
  if (fv.sectorId) qs.set("sectorId", fv.sectorId);
  if (fv.branchId) qs.set("branchId", fv.branchId);
  fv.propertyTypes.forEach((v) => qs.append("propertyType", v));
  fv.statuses.forEach((v) => qs.append("status", v));
  fv.verificationStatuses.forEach((v) => qs.append("verificationStatus", v));
  fv.registrationTypes.forEach((v) => qs.append("registrationType", v));
  fv.constructionStatuses.forEach((v) => qs.append("constructionStatus", v));
  fv.bhawanTypes.forEach((v) => qs.append("bhawanType", v));
  return qs.toString();
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

export function PropertiesClient({ canManage }: { canManage: boolean }) {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<PropertyRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [toDelete, setToDelete] = React.useState<PropertyRow | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [branches, setBranches] = React.useState<BranchOption[]>([]);
  const [branchesLoading, setBranchesLoading] = React.useState(true);
  const [branchesFetchError, setBranchesFetchError] = React.useState<
    string | null
  >(null);
  const [zones, setZones] = React.useState<ZoneSelectOption[]>([]);
  const [zonesLoading, setZonesLoading] = React.useState(true);
  const [zonesFetchError, setZonesFetchError] = React.useState<string | null>(
    null,
  );
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
    React.useState<PropertyListFilterValues>(() => ({
      ...EMPTY_PROPERTY_LIST_FILTERS,
    }));

  const [listPage, setListPage] = React.useState(1);
  const [listMeta, setListMeta] = React.useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  const [exportLoading, setExportLoading] = React.useState(false);

  const gridRows = React.useMemo<PropertyGridRow[]>(
    () =>
      rows.map((r) => ({
        ...r,
        id: r._id,
        zoneNo: zoneNumberLabel(r),
        zoneNameCol: zoneNameLabel(r),
        sectorCol: sectorNameLabel(r),
        branchNameCol: branchNameOnly(r),
        remarksText: remarksPlainPreview(r.remarks),
        bhawanDisplay: bhawanLabel(r.bhawanType),
        constructionDisplay: constructionLabel(r.constructionStatus),
        registrationDisplay: registrationLabel(r.registrationType),
        propertyTypeDisplay: propertyTypeLabel(r.propertyType),
        verificationDisplay: labelFromSnake(r.verificationStatus),
        verifiedByDisplay: verifiedByLabel(r),
        statusDisplay: labelFromSnake(r.status),
      })),
    [rows],
  );

  const columns = React.useMemo<GridColDef<PropertyGridRow>[]>(() => {
    const cols: GridColDef<PropertyGridRow>[] = [];
    cols.push({
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      width: canManage ? 152 : 64,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Stack direction="row" spacing={0.25} justifyContent="center">
          <IconButton
            component={Link}
            href={`/properties/${params.row._id}`}
            size="small"
            aria-label="View property"
          >
            <Eye className="size-4" />
          </IconButton>
          {canManage ? (
            <>
              <IconButton
                component={Link}
                href={`/properties/${params.row._id}/edit`}
                size="small"
                aria-label="Edit property"
              >
                <Pencil className="size-4" />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                aria-label="Delete property"
                onClick={() => setToDelete(params.row)}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </>
          ) : null}
        </Stack>
      ),
    });
    cols.push(
      { field: "zoneNo", headerName: "Zone no.", width: 92 },
      {
        field: "zoneNameCol",
        headerName: "Zone",
        flex: 0.55,
        minWidth: 100,
      },
      {
        field: "sectorCol",
        headerName: "Sector",
        flex: 0.45,
        minWidth: 96,
      },
      {
        field: "branchNameCol",
        headerName: "Branch",
        flex: 0.65,
        minWidth: 118,
      },
      {
        field: "propertyTypeDisplay",
        headerName: "Property type",
        minWidth: 128,
        flex: 0.4,
      },
      {
        field: "propertyName",
        headerName: "Property details",
        flex: 1,
        minWidth: 140,
      },
      { field: "areaHeld", headerName: "Area", flex: 0.55, minWidth: 100 },
      {
        field: "locatedAt",
        headerName: "Location",
        flex: 0.75,
        minWidth: 120,
      },
      {
        field: "remarksText",
        headerName: "Remarks",
        flex: 1,
        minWidth: 160,
      },
      { field: "bhawanDisplay", headerName: "Bhawan", minWidth: 108, flex: 0.35 },
      {
        field: "constructionDisplay",
        headerName: "Construction",
        minWidth: 124,
        flex: 0.5,
      },
      {
        field: "registrationDisplay",
        headerName: "Registration",
        minWidth: 126,
        flex: 0.5,
      },
      {
        field: "verificationDisplay",
        headerName: "Verification",
        width: 118,
      },
      {
        field: "verifiedByDisplay",
        headerName: "Verified by",
        minWidth: 110,
        flex: 0.45,
      },
      { field: "statusDisplay", headerName: "Status", width: 92 },
    );
    return cols;
  }, [canManage]);

  const fetchPage = React.useCallback(
    async (
      page: number,
      search: string,
      fv: PropertyListFilterValues,
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
        if (fv.sectorId) qs.set("sectorId", fv.sectorId);
        if (fv.branchId) qs.set("branchId", fv.branchId);
        fv.propertyTypes.forEach((v) => qs.append("propertyType", v));
        fv.statuses.forEach((v) => qs.append("status", v));
        fv.verificationStatuses.forEach((v) =>
          qs.append("verificationStatus", v),
        );
        fv.registrationTypes.forEach((v) =>
          qs.append("registrationType", v),
        );
        fv.constructionStatuses.forEach((v) =>
          qs.append("constructionStatus", v),
        );
        fv.bhawanTypes.forEach((v) => qs.append("bhawanType", v));
        const res = await fetch(`/api/properties?${qs}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(
            Array.isArray(data?.message)
              ? data.message.join(", ")
              : data?.message ?? "Failed to load properties",
          );
          setRows([]);
          setListMeta(null);
        } else if (isPaginatedList<PropertyRow>(data)) {
          setRows(data.data);
          setListMeta(data.meta);
          if (data.meta.page !== page) {
            setListPage(data.meta.page);
          }
        } else {
          setError("Invalid properties response");
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
    void fetchPage(listPage, debouncedSearch, appliedFilters);
  }, [listPage, debouncedSearch, appliedFilters, fetchPage]);

  React.useEffect(() => {
    void (async () => {
      setBranchesLoading(true);
      setBranchesFetchError(null);
      try {
        const list = await fetchBranchesForSelect();
        setBranches(list);
      } catch {
        setBranches([]);
        setBranchesFetchError("Could not load branches.");
      } finally {
        setBranchesLoading(false);
      }
    })();
  }, []);

  React.useEffect(() => {
    void (async () => {
      setZonesLoading(true);
      setZonesFetchError(null);
      try {
        const list = await fetchActiveZonesForSelect();
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

  async function handleExportExcel() {
    setError(null);
    setExportLoading(true);
    try {
      const q = buildPropertiesExportQuery(debouncedSearch, appliedFilters);
      const url = q ? `/api/properties/export?${q}` : "/api/properties/export";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          Array.isArray(data?.message)
            ? data.message.join(", ")
            : data?.message ?? "Export failed",
        );
        return;
      }
      const blob = await res.blob();
      const fallback = `properties-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/properties/${toDelete._id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? "Delete failed");
        return;
      }
      setToDelete(null);
      await fetchPage(listPage, debouncedSearch, appliedFilters);
    } finally {
      setDeleteLoading(false);
    }
  }

  const pageTotal = listMeta?.total ?? 0;
  const shellPage = listMeta?.page ?? listPage;
  const limit = listMeta?.limit ?? DEFAULT_TABLE_PAGE_SIZE;

  return (
    <div className="space-y-4">
      <PropertiesFilterBar
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
          setAppliedFilters({ ...EMPTY_PROPERTY_LIST_FILTERS });
          setListPage(1);
        }}
        branches={branches}
        branchesLoading={branchesLoading}
        branchesFetchError={branchesFetchError}
        zones={zones}
        zonesLoading={zonesLoading}
        zonesFetchError={zonesFetchError}
        departments={departments}
        departmentsLoading={departmentsLoading}
        departmentsFetchError={departmentsFetchError}
        exportAction={
          <Button
            type="button"
            variant="outline"
            className="h-12 shrink-0 rounded-xl px-4"
            disabled={exportLoading}
            onClick={() => void handleExportExcel()}
          >
            <Download className="mr-2 size-4 shrink-0" />
            {exportLoading ? "Exporting…" : "Export Excel"}
          </Button>
        }
      />

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
        noRowsLabel="No properties yet."
      />

      {canManage ? (
        <Dialog
          open={toDelete !== null}
          onOpenChange={(next) => {
            if (!next) setToDelete(null);
          }}
        >
          <DialogContent
            className="max-w-md rounded-2xl"
            showCloseButton={!deleteLoading}
          >
            <DialogHeader>
              <DialogTitle>Delete property?</DialogTitle>
              <DialogDescription>
                This marks{" "}
                <span className="font-medium text-foreground">
                  {toDelete?.propertyName}
                </span>{" "}
                as deleted.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={deleteLoading}
                onClick={() => setToDelete(null)}
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
    </div>
  );
}
