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
  EMPTY_USER_LIST_FILTERS,
  UsersFilterBar,
  type UserListFilterValues,
} from "@/components/admin/users-filter-bar";
import type { Crumb } from "@/components/layout/page-header";
import { PageHeader } from "@/components/layout/page-header";
import { AppDataGrid } from "@/components/tables/app-data-grid";
import { isPaginatedList } from "@/lib/api/paginated-list";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/hooks/use-client-pagination";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { type GridColDef } from "@mui/x-data-grid";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

type UserStatus = "active" | "inactive" | "deleted";

type UserRow = {
  _id: string;
  name: string;
  email: string;
  username: string;
  contact: string;
  role: "superadmin" | "admin" | "moderator";
  status?: UserStatus;
  /** Publicity department ObjectIds; empty/omitted = unrestricted (non–super-admin). */
  departmentIds?: string[];
  moduleAccess?: Record<string, string>;
};

type UserGridRow = UserRow & { id: string };

export function UsersAdminClient({
  title,
  description,
  crumbs,
}: {
  title: string;
  description: string;
  crumbs: Crumb[];
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<UserRow[]>([]);
  const [listError, setListError] = React.useState<string | null>(null);
  const [userToDelete, setUserToDelete] = React.useState<UserRow | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [appliedFilters, setAppliedFilters] =
    React.useState<UserListFilterValues>(() => ({
      ...EMPTY_USER_LIST_FILTERS,
    }));

  const [listPage, setListPage] = React.useState(1);
  const [listMeta, setListMeta] = React.useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);

  const fetchPage = React.useCallback(
    async (page: number, search: string, fv: UserListFilterValues) => {
      setLoading(true);
      setListError(null);
      try {
        const qs = new URLSearchParams({
          page: String(page),
          limit: String(DEFAULT_TABLE_PAGE_SIZE),
        });
        if (search) qs.set("search", search);
        if (fv.role) qs.set("role", fv.role);
        if (fv.status) qs.set("status", fv.status);
        const res = await fetch(`/api/users?${qs}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setListError(
            Array.isArray(data?.message)
              ? data.message.join(", ")
              : data?.message ?? "Failed to load users",
          );
          setRows([]);
          setListMeta(null);
        } else if (isPaginatedList<UserRow>(data)) {
          setRows(data.data);
          setListMeta(data.meta);
          if (data.meta.page !== page) {
            setListPage(data.meta.page);
          }
        } else {
          setListError("Invalid users response");
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

  async function confirmDelete() {
    if (!userToDelete) return;
    setListError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/users/${userToDelete._id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setListError(
          Array.isArray(data?.message)
            ? data.message.join(", ")
            : data?.message ?? "Delete failed",
        );
        return;
      }
      setUserToDelete(null);
      await fetchPage(listPage, debouncedSearch, appliedFilters);
    } finally {
      setDeleteLoading(false);
    }
  }

  const pageTotal = listMeta?.total ?? 0;
  const shellPage = listMeta?.page ?? listPage;
  const limit = listMeta?.limit ?? DEFAULT_TABLE_PAGE_SIZE;

  const gridRows = React.useMemo<UserGridRow[]>(
    () => rows.map((u) => ({ ...u, id: u._id })),
    [rows],
  );

  const columns = React.useMemo<GridColDef<UserGridRow>[]>(
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
              aria-label="Edit user"
              onClick={() => {
                router.push(`/admin/users/${params.row._id}/edit`);
              }}
            >
              <Pencil className="size-4" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              aria-label="Delete user"
              onClick={() => setUserToDelete(params.row)}
            >
              <Trash2 className="size-4" />
            </IconButton>
          </Stack>
        ),
      },
      { field: "name", headerName: "Name", flex: 0.65, minWidth: 120 },
      { field: "email", headerName: "Email", flex: 0.85, minWidth: 160 },
      { field: "username", headerName: "Username", flex: 0.55, minWidth: 110 },
      {
        field: "contact",
        headerName: "Contact",
        flex: 0.55,
        minWidth: 100,
      },
      {
        field: "role",
        headerName: "Role",
        width: 120,
        renderCell: (params) => (
          <span className="capitalize">{String(params.value ?? "")}</span>
        ),
      },
      {
        field: "status",
        headerName: "Status",
        width: 100,
        renderCell: (params) => (
          <span className="capitalize">
            {String(params.value ?? "active")}
          </span>
        ),
      },
      {
        field: "departmentIds",
        headerName: "Dept. access",
        width: 130,
        sortable: false,
        valueGetter: (_value, row) =>
          row.role === "superadmin"
            ? "—"
            : Array.isArray(row.departmentIds) && row.departmentIds.length > 0
              ? `${row.departmentIds.length} selected`
              : "All departments",
      },
    ],
    [],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        description={description}
        crumbs={crumbs}
        actionsBesideTitle
        actions={
          <Button
            className="rounded-xl shadow-sm"
            type="button"
            onClick={() => router.push("/admin/users/new")}
          >
            <Plus className="size-4" />
            Add user
          </Button>
        }
      />

      <div className="space-y-4">
        <UsersFilterBar
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
            setAppliedFilters({ ...EMPTY_USER_LIST_FILTERS });
            setListPage(1);
          }}
        />

        <Dialog
          open={userToDelete !== null}
          onOpenChange={(next) => {
            if (!next) setUserToDelete(null);
          }}
        >
          <DialogContent
            className="max-w-md rounded-2xl"
            showCloseButton={!deleteLoading}
          >
            <DialogHeader>
              <DialogTitle>Delete user?</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-medium text-foreground">
                  {userToDelete?.username}
                </span>
                ? They will be marked as deleted and won&apos;t be able to sign
                in anymore.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={deleteLoading}
                onClick={() => setUserToDelete(null)}
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
          noRowsLabel="No users found."
        />
      </div>
    </div>
  );
}
