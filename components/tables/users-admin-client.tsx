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
import { PasswordInput } from "@/components/ui/password-input";
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
import { cn } from "@/lib/utils";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { type GridColDef } from "@mui/x-data-grid";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<UserRow[]>([]);
  const [listError, setListError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UserRow | null>(null);
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

  function closeDialog() {
    setFormError(null);
    setOpen(false);
    setEditing(null);
  }

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const contact = String(form.get("contact") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const username = String(form.get("username") ?? "").trim();
    const passwordRaw = String(form.get("password") ?? "");
    const password = passwordRaw.trim();
    const role = String(form.get("role") ?? "moderator");
    const status = String(form.get("status") ?? "active") as UserStatus;

    if (editing) {
      const body: Record<string, string> = {
        name,
        contact,
        email,
        username,
        role,
        status,
      };
      if (password.length > 0) body.password = password;

      const res = await fetch(`/api/users/${editing._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(
          Array.isArray(data?.message)
            ? data.message.join(", ")
            : data?.message ?? "Update failed",
        );
        return;
      }
    } else {
      if (password.length < 6) {
        setFormError("Password must be at least 6 characters.");
        return;
      }
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          contact,
          email,
          username,
          password,
          role,
          status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(
          Array.isArray(data?.message)
            ? data.message.join(", ")
            : data?.message ?? "Create failed",
        );
        return;
      }
    }

    closeDialog();
    await fetchPage(listPage, debouncedSearch, appliedFilters);
  }

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
                setEditing(params.row);
                setOpen(true);
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
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setEditing(null);
              else setFormError(null);
            }}
          >
            <DialogTrigger
              render={
                <Button
                  className="rounded-xl shadow-sm"
                  type="button"
                  onClick={() => setEditing(null)}
                />
              }
            >
              <Plus className="size-4" />
              Add user
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit user" : "Add user"}</DialogTitle>
                <DialogDescription>
                  {editing
                    ? "Update profile, role, status, or set a new password."
                    : "Create a new system user with the right role and status."}
                </DialogDescription>
              </DialogHeader>
              <form
                key={editing?._id ?? "create"}
                className="space-y-4"
                onSubmit={onSave}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      defaultValue={editing?.name ?? ""}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Contact</Label>
                    <Input
                      id="contact"
                      name="contact"
                      required
                      defaultValue={editing?.contact ?? ""}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      defaultValue={editing?.email ?? ""}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      name="username"
                      required
                      defaultValue={editing?.username ?? ""}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="password">
                      Password{" "}
                      {editing ? (
                        <span className="font-normal text-muted-foreground">
                          (leave blank to keep current)
                        </span>
                      ) : null}
                    </Label>
                    <PasswordInput
                      id="password"
                      name="password"
                      required={!editing}
                      autoComplete="new-password"
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <select
                      id="role"
                      name="role"
                      defaultValue={editing?.role ?? "moderator"}
                      className={cn(
                        "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm",
                      )}
                    >
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Superadmin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      name="status"
                      defaultValue={editing?.status ?? "active"}
                      className={cn(
                        "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm",
                      )}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="deleted">Deleted</option>
                    </select>
                  </div>
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
                    onClick={closeDialog}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="rounded-xl shadow-sm">
                    {editing ? "Save changes" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
