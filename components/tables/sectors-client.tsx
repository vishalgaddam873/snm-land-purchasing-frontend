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
  ZoneSearchableSelect,
  type ZoneSelectOption,
} from "@/components/branches/zone-searchable-select";
import type { Crumb } from "@/components/layout/page-header";
import { PageHeader } from "@/components/layout/page-header";
import { AppDataGrid } from "@/components/tables/app-data-grid";
import { SectorsBulkExcelControls } from "@/components/sectors/sectors-bulk-excel-controls";
import {
  EMPTY_SECTOR_LIST_FILTERS,
  SectorsFilterBar,
  type SectorListFilterValues,
} from "@/components/zones/sectors-filter-bar";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { type GridColDef } from "@mui/x-data-grid";
import { isPaginatedList } from "@/lib/api/paginated-list";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/hooks/use-client-pagination";
import { cn } from "@/lib/utils";
import { Pencil, Plus, Trash2 } from "lucide-react";
import * as React from "react";

type PopulatedZone = {
  _id: string;
  name: string;
  zoneNumber: string;
};

type SectorRow = {
  _id: string;
  name: string;
  /** Present for all sectors created after `sectorNumber` was added. */
  sectorNumber?: string;
  zoneId: PopulatedZone | string;
  status: "active" | "inactive" | "deleted";
};

type SectorGridRow = SectorRow & { id: string; zoneDisplay: string };

function zoneLabel(s: SectorRow): string {
  const z = s.zoneId;
  if (z && typeof z === "object" && "name" in z) {
    return `${z.name} (${z.zoneNumber})`;
  }
  return "—";
}

function zoneIdValue(s: SectorRow): string {
  const z = s.zoneId;
  if (z && typeof z === "object" && "_id" in z) {
    return String(z._id);
  }
  return String(z ?? "");
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

export function SectorsClient({
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
  const [rows, setRows] = React.useState<SectorRow[]>([]);
  const [zones, setZones] = React.useState<ZoneSelectOption[]>([]);
  const [zonesLoading, setZonesLoading] = React.useState(true);
  const [zonesFetchError, setZonesFetchError] = React.useState<string | null>(
    null,
  );
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [appliedFilters, setAppliedFilters] =
    React.useState<SectorListFilterValues>(() => ({
      ...EMPTY_SECTOR_LIST_FILTERS,
    }));
  const [error, setError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [edit, setEdit] = React.useState<SectorRow | null>(null);
  const [sectorToDelete, setSectorToDelete] = React.useState<SectorRow | null>(
    null,
  );
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [dialogZoneId, setDialogZoneId] = React.useState("");

  const [listPage, setListPage] = React.useState(1);
  const [listMeta, setListMeta] = React.useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);

  const sortedZones = React.useMemo(() => sortZonesForSelect(zones), [zones]);

  const dialogZoneTriggerLabel = React.useMemo(() => {
    if (!dialogZoneId) return "Select zone";
    if (zonesLoading) return "Loading…";
    const z = sortedZones.find((x) => zoneOptionId(x) === dialogZoneId);
    return z ? `${z.name} (${z.zoneNumber})` : "Unknown zone";
  }, [dialogZoneId, sortedZones, zonesLoading]);

  const fetchSectorsPage = React.useCallback(
    async (page: number, search: string, fv: SectorListFilterValues) => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          page: String(page),
          limit: String(DEFAULT_TABLE_PAGE_SIZE),
        });
        if (search) qs.set("search", search);
        if (fv.zoneId) qs.set("zoneId", fv.zoneId);
        if (fv.status) qs.set("status", fv.status);
        const res = await fetch(`/api/sectors?${qs}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(
            Array.isArray(data?.message)
              ? data.message.join(", ")
              : data?.message ?? "Failed to load sectors",
          );
          setRows([]);
          setListMeta(null);
        } else if (isPaginatedList<SectorRow>(data)) {
          setRows(data.data);
          setListMeta(data.meta);
          if (data.meta.page !== page) {
            setListPage(data.meta.page);
          }
        } else {
          setError("Invalid sectors response");
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
    void fetchSectorsPage(listPage, debouncedSearch, appliedFilters);
  }, [listPage, debouncedSearch, appliedFilters, fetchSectorsPage]);

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
    const sectorNumber = String(form.get("sectorNumber") ?? "").trim();
    const zoneId = dialogZoneId.trim();
    const status = String(form.get("status") ?? "active") as SectorRow["status"];

    if (!name || !sectorNumber || !zoneId) {
      setFormError("Sector name, sector number, and zone are required.");
      return;
    }

    const url = edit ? `/api/sectors/${edit._id}` : "/api/sectors";
    const method = edit ? "PATCH" : "POST";
    const body = { name, sectorNumber, zoneId, status };

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
    await fetchSectorsPage(listPage, debouncedSearch, appliedFilters);
  }

  async function confirmDelete() {
    if (!sectorToDelete) return;
    setError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/sectors/${sectorToDelete._id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? "Delete failed");
        return;
      }
      setSectorToDelete(null);
      await fetchSectorsPage(listPage, debouncedSearch, appliedFilters);
    } finally {
      setDeleteLoading(false);
    }
  }

  const pageTotal = listMeta?.total ?? 0;
  const shellPage = listMeta?.page ?? listPage;
  const limit = listMeta?.limit ?? DEFAULT_TABLE_PAGE_SIZE;

  const gridRows = React.useMemo<SectorGridRow[]>(
    () =>
      rows.map((s) => ({
        ...s,
        id: s._id,
        zoneDisplay: zoneLabel(s),
      })),
    [rows],
  );

  const columns = React.useMemo<GridColDef<SectorGridRow>[]>(() => {
    const cols: GridColDef<SectorGridRow>[] = [];
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
              aria-label="Edit sector"
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
              aria-label="Delete sector"
              onClick={() => setSectorToDelete(params.row)}
            >
              <Trash2 className="size-4" />
            </IconButton>
          </Stack>
        ),
      });
    }
    cols.push(
      {
        field: "sectorNumber",
        headerName: "Sector no.",
        width: 104,
        valueGetter: (_value, row) => row.sectorNumber?.trim() || "—",
      },
      { field: "name", headerName: "Sector name", flex: 1, minWidth: 140 },
      {
        field: "zoneDisplay",
        headerName: "Zone",
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
                Add sector
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>{edit ? "Edit sector" : "Add sector"}</DialogTitle>
                  <DialogDescription>
                    Sectors are grouped under a zone. Branches can optionally
                    reference a sector.
                  </DialogDescription>
                </DialogHeader>
                <form
                  key={edit?._id ?? "create"}
                  className="space-y-4"
                  onSubmit={onSave}
                >
                  <div className="space-y-2">
                    <Label htmlFor="sector-number">Sector number</Label>
                    <Input
                      id="sector-number"
                      name="sectorNumber"
                      required
                      placeholder="e.g. 1, 1A"
                      defaultValue={edit?.sectorNumber ?? ""}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sector-name">Sector name</Label>
                    <Input
                      id="sector-name"
                      name="name"
                      required
                      defaultValue={edit?.name ?? ""}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sector-zoneId">Zone</Label>
                    <ZoneSearchableSelect
                      id="sector-zoneId"
                      zones={sortedZones}
                      disabled={zonesLoading}
                      value={dialogZoneId}
                      onChange={setDialogZoneId}
                      triggerLabel={dialogZoneTriggerLabel}
                      showAllOption={false}
                      triggerClassName="h-10 w-full rounded-xl"
                      menuZIndexClass="z-[400]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sector-status">Status</Label>
                    <select
                      id="sector-status"
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
        <SectorsFilterBar
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
            setAppliedFilters({ ...EMPTY_SECTOR_LIST_FILTERS });
            setListPage(1);
          }}
          zones={zones}
          zonesLoading={zonesLoading}
          zonesFetchError={zonesFetchError}
          toolbarAction={
            canManage ? (
              <SectorsBulkExcelControls
                onImported={() => {
                  void fetchSectorsPage(
                    listPage,
                    debouncedSearch,
                    appliedFilters,
                  );
                }}
              />
            ) : null
          }
        />

        {canManage ? (
          <Dialog
            open={sectorToDelete !== null}
            onOpenChange={(next) => {
              if (!next) setSectorToDelete(null);
            }}
          >
            <DialogContent
              className="max-w-md rounded-2xl"
              showCloseButton={!deleteLoading}
            >
              <DialogHeader>
                <DialogTitle>Delete sector?</DialogTitle>
                <DialogDescription>
                  Are you sure you want to remove{" "}
                  <span className="font-medium text-foreground">
                    {sectorToDelete?.name}
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
                  onClick={() => setSectorToDelete(null)}
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
          noRowsLabel="No sectors found."
        />
      </div>
    </div>
  );
}
