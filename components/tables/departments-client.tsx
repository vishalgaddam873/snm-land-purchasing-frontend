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
import type { Crumb } from "@/components/layout/page-header";
import { PageHeader } from "@/components/layout/page-header";
import {
  DepartmentsFilterBar,
  EMPTY_DEPARTMENT_LIST_FILTERS,
  type DepartmentListFilterValues,
} from "@/components/departments/departments-filter-bar";
import { AppDataGrid } from "@/components/tables/app-data-grid";
import { isPaginatedList } from "@/lib/api/paginated-list";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/hooks/use-client-pagination";
import { cn } from "@/lib/utils";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { type GridColDef } from "@mui/x-data-grid";
import { Pencil, Plus, Trash2 } from "lucide-react";
import * as React from "react";

type Dept = {
  _id: string;
  name: string;
  code: string;
  status: "active" | "inactive" | "deleted";
};

type DeptGridRow = Dept & { id: string };

export function DepartmentsClient({
  title,
  description,
  crumbs,
}: {
  title: string;
  description: string;
  crumbs: Crumb[];
}) {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<Dept[]>([]);
  const [listError, setListError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [edit, setEdit] = React.useState<Dept | null>(null);

  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [appliedFilters, setAppliedFilters] =
    React.useState<DepartmentListFilterValues>(() => ({
      ...EMPTY_DEPARTMENT_LIST_FILTERS,
    }));

  const [listPage, setListPage] = React.useState(1);
  const [listMeta, setListMeta] = React.useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);

  const fetchPage = React.useCallback(
    async (page: number, search: string, fv: DepartmentListFilterValues) => {
      setLoading(true);
      setListError(null);
      try {
        const qs = new URLSearchParams({
          page: String(page),
          limit: String(DEFAULT_TABLE_PAGE_SIZE),
        });
        if (search) qs.set("search", search);
        if (fv.status) qs.set("status", fv.status);
        const res = await fetch(`/api/publicity-departments?${qs}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setListError(
            Array.isArray(data?.message)
              ? data.message.join(", ")
              : data?.message ?? "Failed to load departments",
          );
          setRows([]);
          setListMeta(null);
        } else if (isPaginatedList<Dept>(data)) {
          setRows(data.data);
          setListMeta(data.meta);
          if (data.meta.page !== page) {
            setListPage(data.meta.page);
          }
        } else {
          setListError("Invalid departments response");
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

  async function onCreateOrUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
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
      setFormError(
        Array.isArray(data?.message)
          ? data.message.join(", ")
          : data?.message ?? "Save failed",
      );
      return;
    }

    setOpen(false);
    setEdit(null);
    await fetchPage(listPage, debouncedSearch, appliedFilters);
  }

  const onDelete = React.useCallback(
    async (id: string) => {
      const res = await fetch(`/api/publicity-departments/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchPage(listPage, debouncedSearch, appliedFilters);
      }
    },
    [listPage, debouncedSearch, appliedFilters, fetchPage],
  );

  const pageTotal = listMeta?.total ?? 0;
  const shellPage = listMeta?.page ?? listPage;
  const limit = listMeta?.limit ?? DEFAULT_TABLE_PAGE_SIZE;

  const gridRows = React.useMemo<DeptGridRow[]>(
    () => rows.map((d) => ({ ...d, id: d._id })),
    [rows],
  );

  const columns = React.useMemo<GridColDef<DeptGridRow>[]>(
    () => [
      {
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
              aria-label="Edit department"
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
              aria-label="Delete department"
              onClick={() => void onDelete(params.row._id)}
            >
              <Trash2 className="size-4" />
            </IconButton>
          </Stack>
        ),
      },
      { field: "code", headerName: "Code", width: 120 },
      { field: "name", headerName: "Name", flex: 1, minWidth: 160 },
      {
        field: "status",
        headerName: "Status",
        width: 110,
        renderCell: (params) => (
          <span className="capitalize">{String(params.value ?? "")}</span>
        ),
      },
    ],
    [onDelete],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        description={description}
        crumbs={crumbs}
        actionsBesideTitle
        actions={
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
              Add department
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>
                  {edit ? "Edit department" : "Add department"}
                </DialogTitle>
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
        }
      />

      <div className="space-y-4">
        <DepartmentsFilterBar
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
            setAppliedFilters({ ...EMPTY_DEPARTMENT_LIST_FILTERS });
            setListPage(1);
          }}
        />

        {listError ? (
          <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {listError}
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
          noRowsLabel="No departments found."
        />
      </div>
    </div>
  );
}
