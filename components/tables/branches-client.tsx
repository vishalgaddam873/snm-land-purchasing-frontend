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
import { BranchesBulkExcelControls } from "@/components/branches/branches-bulk-excel-controls";
import { BranchesFilterBar } from "@/components/branches/branches-filter-bar";
import {
  SectorSearchableSelect,
  type SectorSelectOption,
} from "@/components/branches/sector-searchable-select";
import {
  ZoneSearchableSelect,
  type ZoneSelectOption,
} from "@/components/branches/zone-searchable-select";
import type { Crumb } from "@/components/layout/page-header";
import { PageHeader } from "@/components/layout/page-header";
import { AppDataGrid } from "@/components/tables/app-data-grid";
import {
  applyBranchFilters,
  clearAllBranchListFilters,
  deleteBranchOnServer,
  exportBranchesExcel,
  fetchBranchesList,
  loadBranchesFilterOptions,
  setDebouncedSearch,
  setListPage,
  setSearchInput,
  type BranchRow,
} from "@/lib/store/features/branchesPageSlice";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/hooks/use-client-pagination";
import { compareZoneNumbers } from "@/lib/zone-number-sort";
import { cn } from "@/lib/utils";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { type GridColDef } from "@mui/x-data-grid";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import * as React from "react";

type BranchGridRow = BranchRow & {
  id: string;
  zoneDisplay: string;
  departmentDisplay: string;
  sectorDisplay: string;
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

function sectorLabel(b: BranchRow): string {
  const s = b.sectorId;
  if (s && typeof s === "object" && "name" in s && s.name?.trim()) {
    const num = s.sectorNumber?.trim();
    return num ? `${s.name} (${num})` : s.name;
  }
  return "—";
}

function sectorIdValue(b: BranchRow): string {
  const s = b.sectorId;
  if (s && typeof s === "object" && "_id" in s) {
    return String(s._id);
  }
  if (typeof s === "string" && s) return s;
  return "";
}

function zoneOptionId(z: ZoneSelectOption): string {
  if (z._id != null && z._id !== "") {
    return String(z._id);
  }
  return "";
}

function sortZonesForSelect(zones: ZoneSelectOption[]): ZoneSelectOption[] {
  return [...zones].sort((x, y) => {
    const c = compareZoneNumbers(x.zoneNumber ?? "", y.zoneNumber ?? "");
    if (c !== 0) return c;
    const da =
      x.departmentId != null && x.departmentId !== ""
        ? String(x.departmentId)
        : "";
    const db =
      y.departmentId != null && y.departmentId !== ""
        ? String(y.departmentId)
        : "";
    return da.localeCompare(db);
  });
}

type SectorOptionRow = { _id: string; name: string; sectorNumber?: string };

async function fetchSectorsForZone(
  zoneId: string,
): Promise<SectorOptionRow[]> {
  if (!zoneId.trim()) return [];
  const res = await fetch(
    `/api/sectors/for-select?zoneId=${encodeURIComponent(zoneId)}`,
    { cache: "no-store" },
  );
  const data = await res.json().catch(() => []);
  if (!res.ok || !Array.isArray(data)) return [];
  return data as SectorOptionRow[];
}

export function BranchesClient({
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
  const dispatch = useAppDispatch();
  const loading = useAppSelector((s) => s.branchesPage.loading);
  const rows = useAppSelector((s) => s.branchesPage.rows);
  const error = useAppSelector((s) => s.branchesPage.error);
  const zonesLoading = useAppSelector((s) => s.branchesPage.zonesLoading);
  const departmentsLoading = useAppSelector(
    (s) => s.branchesPage.departmentsLoading,
  );
  const zones = useAppSelector((s) => s.branchesPage.zones);
  const departments = useAppSelector((s) => s.branchesPage.departments);
  const searchInput = useAppSelector((s) => s.branchesPage.searchInput);
  const debouncedSearch = useAppSelector((s) => s.branchesPage.debouncedSearch);
  const appliedFilters = useAppSelector((s) => s.branchesPage.appliedFilters);
  const listPage = useAppSelector((s) => s.branchesPage.listPage);
  const listMeta = useAppSelector((s) => s.branchesPage.listMeta);
  const zonesFetchError = useAppSelector((s) => s.branchesPage.zonesFetchError);
  const departmentsFetchError = useAppSelector(
    (s) => s.branchesPage.departmentsFetchError,
  );
  const deleteLoading = useAppSelector((s) => s.branchesPage.deleteLoading);
  const exportLoading = useAppSelector((s) => s.branchesPage.exportLoading);

  const [formError, setFormError] = React.useState<string | null>(null);
  const [dialogZoneId, setDialogZoneId] = React.useState("");
  const [dialogSectorId, setDialogSectorId] = React.useState("");
  const [sectorsForDialog, setSectorsForDialog] = React.useState<
    SectorOptionRow[]
  >([]);
  const [sectorsLoading, setSectorsLoading] = React.useState(false);

  const [open, setOpen] = React.useState(false);
  const [edit, setEdit] = React.useState<BranchRow | null>(null);
  const [branchToDelete, setBranchToDelete] =
    React.useState<BranchRow | null>(null);

  const sortedZones = React.useMemo(() => sortZonesForSelect(zones), [zones]);

  const dialogZoneTriggerLabel = React.useMemo(() => {
    if (!dialogZoneId) return "Select zone";
    if (zonesLoading) return "Loading…";
    const z = sortedZones.find((x) => zoneOptionId(x) === dialogZoneId);
    return z ? `${z.name} (${z.zoneNumber})` : "Unknown zone";
  }, [dialogZoneId, sortedZones, zonesLoading]);

  const dialogSectors = React.useMemo<SectorSelectOption[]>(
    () =>
      sectorsForDialog.map((s) => ({
        _id: s._id,
        name: s.name,
        sectorNumber: s.sectorNumber,
      })),
    [sectorsForDialog],
  );

  const dialogSectorTriggerLabel = React.useMemo(() => {
    if (!dialogZoneId.trim()) return "Select a zone first";
    if (sectorsLoading) return "Loading sectors…";
    if (!dialogSectorId) return "No sector";
    const s = dialogSectors.find((x) => x._id === dialogSectorId);
    if (!s) return "Unknown sector";
    const n = s.sectorNumber?.trim();
    return n ? `${s.name} (${n})` : s.name;
  }, [dialogZoneId, dialogSectorId, dialogSectors, sectorsLoading]);

  const skipSearchPageReset = React.useRef(true);
  React.useEffect(() => {
    const id = window.setTimeout(() => {
      dispatch(setDebouncedSearch(searchInput.trim()));
    }, 400);
    return () => window.clearTimeout(id);
  }, [searchInput, dispatch]);

  React.useEffect(() => {
    if (skipSearchPageReset.current) {
      skipSearchPageReset.current = false;
      return;
    }
    dispatch(setListPage(1));
  }, [debouncedSearch, dispatch]);

  React.useEffect(() => {
    void dispatch(fetchBranchesList());
  }, [listPage, debouncedSearch, appliedFilters, dispatch]);

  React.useEffect(() => {
    void dispatch(loadBranchesFilterOptions());
  }, [dispatch]);

  React.useEffect(() => {
    if (open) {
      setDialogZoneId(edit ? zoneIdValue(edit) : "");
      setDialogSectorId(edit ? sectorIdValue(edit) : "");
    }
  }, [open, edit]);

  React.useEffect(() => {
    if (!open || !dialogZoneId.trim()) {
      setSectorsForDialog([]);
      return;
    }
    let cancelled = false;
    setSectorsLoading(true);
    void (async () => {
      try {
        const list = await fetchSectorsForZone(dialogZoneId);
        if (!cancelled) setSectorsForDialog(list);
      } catch {
        if (!cancelled) setSectorsForDialog([]);
      } finally {
        if (!cancelled) setSectorsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, dialogZoneId]);

  function closeForm() {
    setFormError(null);
    setOpen(false);
    setEdit(null);
    setDialogZoneId("");
    setDialogSectorId("");
    setSectorsForDialog([]);
  }

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const branchCode = String(form.get("branchCode") ?? "").trim();
    const zoneId = dialogZoneId.trim();
    const status = String(form.get("status") ?? "active") as BranchRow["status"];

    if (!name || !zoneId) {
      setFormError("Branch name and zone are required.");
      return;
    }

    const url = edit ? `/api/branches/${edit._id}` : "/api/branches";
    const method = edit ? "PATCH" : "POST";
    const sectorId =
      dialogSectorId.trim() !== "" ? dialogSectorId.trim() : null;
    const body: Record<string, unknown> = {
      name,
      zoneId,
      status,
      sectorId,
    };
    if (edit) {
      body.branchCode = branchCode;
    } else if (branchCode) {
      body.branchCode = branchCode;
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
    void dispatch(fetchBranchesList());
  }

  async function confirmDelete() {
    if (!branchToDelete) return;
    try {
      await dispatch(deleteBranchOnServer(branchToDelete._id)).unwrap();
      setBranchToDelete(null);
    } catch {
      /* error surfaced via branchesPage.error */
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
        sectorDisplay: sectorLabel(b),
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
        field: "branchCode",
        headerName: "Branch code",
        width: 120,
        valueGetter: (_value, row) => row.branchCode?.trim() || "—",
      },
      {
        field: "sectorDisplay",
        headerName: "Sector",
        flex: 0.55,
        minWidth: 100,
      },
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
                  setDialogSectorId("");
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
                    <Label htmlFor="branch-code">Branch code</Label>
                    <Input
                      id="branch-code"
                      name="branchCode"
                      defaultValue={edit?.branchCode ?? ""}
                      placeholder="Optional"
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch-zoneId">Zone</Label>
                    <ZoneSearchableSelect
                      id="branch-zoneId"
                      zones={sortedZones}
                      disabled={zonesLoading}
                      value={dialogZoneId}
                      onChange={(v) => {
                        setDialogZoneId(v);
                        setDialogSectorId("");
                      }}
                      triggerLabel={dialogZoneTriggerLabel}
                      showAllOption={false}
                      triggerClassName="h-10 w-full rounded-xl"
                      menuZIndexClass="z-[400]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch-sectorId">Sector (optional)</Label>
                    <SectorSearchableSelect
                      id="branch-sectorId"
                      sectors={dialogSectors}
                      disabled={!dialogZoneId.trim() || sectorsLoading}
                      value={dialogSectorId}
                      onChange={setDialogSectorId}
                      triggerLabel={dialogSectorTriggerLabel}
                      showAllOption
                      allOptionLabel="No sector"
                      triggerClassName="h-10 w-full rounded-xl"
                      menuZIndexClass="z-[400]"
                    />
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
          onSearchChange={(v) => dispatch(setSearchInput(v))}
          appliedFilters={appliedFilters}
          onApplyFilters={(next) => {
            dispatch(applyBranchFilters(next));
          }}
          onClearAll={() => dispatch(clearAllBranchListFilters())}
          departments={departments}
          departmentsLoading={departmentsLoading}
          departmentsFetchError={departmentsFetchError}
          zones={zones}
          zonesLoading={zonesLoading}
          zonesFetchError={zonesFetchError}
          exportAction={
            canManage ? (
              <div className="flex flex-wrap items-stretch justify-end gap-2">
                <BranchesBulkExcelControls
                  onImported={() => void dispatch(fetchBranchesList())}
                />
                {canExportExcel ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 shrink-0 rounded-xl px-4"
                    disabled={exportLoading}
                    onClick={() => void dispatch(exportBranchesExcel())}
                  >
                    <Download className="mr-2 size-4 shrink-0" />
                    {exportLoading ? "Exporting…" : "Export Excel"}
                  </Button>
                ) : null}
              </div>
            ) : undefined
          }
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
            dispatch(setListPage(model.page + 1));
          }}
          noRowsLabel="No branches found."
        />
      </div>
    </div>
  );
}
