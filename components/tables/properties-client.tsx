"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PropertiesBulkExcelControls } from "@/components/properties/properties-bulk-excel-controls";
import { PropertiesFilterBar } from "@/components/properties/properties-filter-bar";
import { AppDataGrid } from "@/components/tables/app-data-grid";
import {
  applyFilters,
  clearAllListFilters,
  deletePropertyOnServer,
  exportPropertiesExcel,
  fetchPropertiesList,
  loadPropertiesFilterOptions,
  setDebouncedSearch,
  setListPage,
  setSearchInput,
  setToDelete,
} from "@/lib/store/features/propertiesPageSlice";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  bhawanLabel,
  constructionLabel,
  labelFromSnake,
  propertyTypeLabel,
  registrationLabel,
  remarksPlainPreview,
  verifiedByLabel,
  zoneNameLabel,
  zoneNumberLabel,
  sectorNameLabel,
  branchNameOnly,
  type PropertyRow,
} from "@/components/properties/property-helpers";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/hooks/use-client-pagination";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { type GridColDef } from "@mui/x-data-grid";
import { Download, Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";

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

export function PropertiesClient({ canManage }: { canManage: boolean }) {
  const dispatch = useAppDispatch();
  const loading = useAppSelector((s) => s.propertiesPage.loading);
  const rows = useAppSelector((s) => s.propertiesPage.rows);
  const error = useAppSelector((s) => s.propertiesPage.error);
  const toDelete = useAppSelector((s) => s.propertiesPage.toDelete);
  const deleteLoading = useAppSelector((s) => s.propertiesPage.deleteLoading);
  const branches = useAppSelector((s) => s.propertiesPage.branches);
  const branchesLoading = useAppSelector((s) => s.propertiesPage.branchesLoading);
  const branchesFetchError = useAppSelector(
    (s) => s.propertiesPage.branchesFetchError,
  );
  const zones = useAppSelector((s) => s.propertiesPage.zones);
  const zonesLoading = useAppSelector((s) => s.propertiesPage.zonesLoading);
  const zonesFetchError = useAppSelector((s) => s.propertiesPage.zonesFetchError);
  const departments = useAppSelector((s) => s.propertiesPage.departments);
  const departmentsLoading = useAppSelector(
    (s) => s.propertiesPage.departmentsLoading,
  );
  const departmentsFetchError = useAppSelector(
    (s) => s.propertiesPage.departmentsFetchError,
  );
  const searchInput = useAppSelector((s) => s.propertiesPage.searchInput);
  const debouncedSearch = useAppSelector((s) => s.propertiesPage.debouncedSearch);
  const appliedFilters = useAppSelector((s) => s.propertiesPage.appliedFilters);
  const listPage = useAppSelector((s) => s.propertiesPage.listPage);
  const listMeta = useAppSelector((s) => s.propertiesPage.listMeta);
  const exportLoading = useAppSelector((s) => s.propertiesPage.exportLoading);

  const shellPage = listMeta?.page ?? listPage;
  const limit = listMeta?.limit ?? DEFAULT_TABLE_PAGE_SIZE;
  const pageTotal = listMeta?.total ?? 0;

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
                onClick={() => dispatch(setToDelete(params.row))}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </>
          ) : null}
        </Stack>
      ),
    });
    cols.push(
      { field: "zoneNo", headerName: "Zone No.", width: 92 },
      {
        field: "zoneNameCol",
        headerName: "Zone Name",
        flex: 0.55,
        minWidth: 100,
      },
      {
        field: "sectorCol",
        headerName: "Sector Name",
        flex: 0.45,
        minWidth: 96,
      },
      {
        field: "branchNameCol",
        headerName: "Branch Name",
        flex: 0.65,
        minWidth: 118,
      },
      {
        field: "propertyTypeDisplay",
        headerName: "Property Type",
        minWidth: 128,
        flex: 0.4,
      },
      {
        field: "propertyName",
        headerName: "Property Name / Details",
        flex: 1,
        minWidth: 140,
      },
      {
        field: "areaHeld",
        headerName: "Properties Held (Area)",
        flex: 0.55,
        minWidth: 120,
      },
      {
        field: "locatedAt",
        headerName: "Location at (Place)",
        flex: 0.75,
        minWidth: 120,
      },
      {
        field: "bhawanDisplay",
        headerName: "Bhawan / Structure Type",
        minWidth: 128,
        flex: 0.4,
      },
      {
        field: "constructionDisplay",
        headerName: "Construction status",
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
        field: "remarksText",
        headerName: "Remarks",
        flex: 1,
        minWidth: 160,
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
  }, [canManage, dispatch]);

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
    void dispatch(fetchPropertiesList());
  }, [listPage, debouncedSearch, appliedFilters, dispatch]);

  React.useEffect(() => {
    void dispatch(loadPropertiesFilterOptions());
  }, [dispatch]);

  return (
    <div className="space-y-4">
      <PropertiesFilterBar
        search={searchInput}
        onSearchChange={(v) => dispatch(setSearchInput(v))}
        appliedFilters={appliedFilters}
        onApplyFilters={(next) => {
          dispatch(applyFilters(next));
        }}
        onClearAll={() => dispatch(clearAllListFilters())}
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
          <div className="flex flex-wrap items-stretch justify-end gap-2">
            {canManage ? (
              <PropertiesBulkExcelControls
                onImported={() => void dispatch(fetchPropertiesList())}
              />
            ) : null}
            {canManage ? (
              <Button
                type="button"
                variant="outline"
                className="h-12 shrink-0 rounded-xl px-4"
                disabled={exportLoading}
                onClick={() => void dispatch(exportPropertiesExcel())}
              >
                <Download className="mr-2 size-4 shrink-0" />
                {exportLoading ? "Exporting…" : "Export Excel"}
              </Button>
            ) : null}
          </div>
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
          dispatch(setListPage(model.page + 1));
        }}
        noRowsLabel="No properties yet."
      />

      {canManage ? (
        <Dialog
          open={toDelete !== null}
          onOpenChange={(next) => {
            if (!next) dispatch(setToDelete(null));
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
                onClick={() => dispatch(setToDelete(null))}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="rounded-xl"
                disabled={deleteLoading}
                onClick={() => {
                  if (toDelete) void dispatch(deletePropertyOnServer(toDelete._id));
                }}
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
