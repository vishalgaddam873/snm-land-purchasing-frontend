"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isPaginatedList } from "@/lib/api/paginated-list";
import {
  APP_MODULE_IDS,
  MODULE_LABELS,
  type AppModuleId,
  type ModuleAccessLevel,
  defaultModuleAccessFormState,
  formModuleAccessToPayload,
  moduleAccessFromUser,
} from "@/lib/auth/module-access";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import * as React from "react";

type UserStatus = "active" | "inactive" | "deleted";

export type AdminUserEditable = {
  _id: string;
  name: string;
  email: string;
  username: string;
  contact: string;
  role: "superadmin" | "admin" | "moderator";
  status?: UserStatus;
  departmentIds?: string[];
  moduleAccess?: Record<string, string>;
};

type DeptOption = { _id: string; name: string; code?: string };

export function UserFormPageClient({
  mode,
  user,
}: {
  mode: "create" | "edit";
  user?: AdminUserEditable;
}) {
  const router = useRouter();

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [deptOptions, setDeptOptions] = React.useState<DeptOption[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = React.useState<string[]>(
    () => user?.departmentIds?.map((x) => String(x)) ?? [],
  );
  const [deptLoading, setDeptLoading] = React.useState(false);
  const [deptError, setDeptError] = React.useState<string | null>(null);

  const [roleDraft, setRoleDraft] = React.useState<
    "superadmin" | "admin" | "moderator"
  >(user?.role ?? "moderator");

  const [moduleAccessForm, setModuleAccessForm] = React.useState<
    Record<AppModuleId, ModuleAccessLevel>
  >(() => {
    if (user?.role === "superadmin") return defaultModuleAccessFormState();
    return moduleAccessFromUser(user?.moduleAccess);
  });

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setDeptLoading(true);
      setDeptError(null);

      const merged: DeptOption[] = [];
      let loadErr: string | null = null;
      try {
        let page = 1;
        let totalPages = 1;
        const limit = 100;
        const maxPages = 50;

        do {
          const res = await fetch(
            `/api/publicity-departments?limit=${limit}&page=${page}`,
            { cache: "no-store", credentials: "same-origin" },
          );
          const data = await res.json().catch(() => ({}));
          if (cancelled) return;

          if (!res.ok) {
            loadErr = Array.isArray(data?.message)
              ? data.message.join(", ")
              : typeof data?.message === "string"
                ? data.message
                : `Could not load departments (${res.status})`;
            break;
          }

          if (
            !isPaginatedList<{ _id: unknown; name: string; code?: string }>(
              data,
            )
          ) {
            loadErr = "Unexpected response when loading departments.";
            break;
          }

          for (const d of data.data) {
            merged.push({
              _id: String(d._id),
              name: String(d.name ?? ""),
              code: d.code != null ? String(d.code) : undefined,
            });
          }

          totalPages = data.meta.totalPages;
          page += 1;
        } while (page <= totalPages && page <= maxPages);
      } catch (e) {
        loadErr = e instanceof Error ? e.message : "Failed to load departments.";
      } finally {
        if (!cancelled) {
          setDeptLoading(false);
          setDeptError(loadErr);
          setDeptOptions(loadErr ? [] : merged);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const form = new FormData(e.currentTarget);
      const name = String(form.get("name") ?? "").trim();
      const contact = String(form.get("contact") ?? "").trim();
      const email = String(form.get("email") ?? "").trim();
      const username = String(form.get("username") ?? "").trim();
      const passwordRaw = String(form.get("password") ?? "");
      const password = passwordRaw.trim();
      const status = String(form.get("status") ?? "active") as UserStatus;

      if (mode === "create" && password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }

      const payloadModule = formModuleAccessToPayload(moduleAccessForm) ?? {};
      const body: Record<string, unknown> = {
        name,
        contact,
        email,
        username,
        role: roleDraft,
        status,
        departmentIds: selectedDeptIds,
      };

      if (roleDraft !== "superadmin") {
        body.moduleAccess = payloadModule;
      } else {
        body.moduleAccess = {};
      }

      if (password.length > 0) body.password = password;

      const res =
        mode === "create"
          ? await fetch("/api/users", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(body),
            })
          : await fetch(`/api/users/${user?._id}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(body),
            });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          Array.isArray(data?.message)
            ? data.message.join(", ")
            : data?.message ??
                (mode === "create" ? "Create failed" : "Update failed"),
        );
        return;
      }

      router.push("/admin/users");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const isSuperadmin = roleDraft === "superadmin";
  const levelCounts = React.useMemo(() => {
    const counts: Record<ModuleAccessLevel, number> = {
      edit: 0,
      view: 0,
      none: 0,
    };
    for (const id of APP_MODULE_IDS) {
      counts[moduleAccessForm[id]] += 1;
    }
    return counts;
  }, [moduleAccessForm]);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {mode === "create"
            ? "Create a new user and configure their access."
            : "Update user profile, status, and access controls."}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={saving}
            onClick={() => router.push("/admin/users")}
          >
            Cancel
          </Button>
          <Button type="submit" className="rounded-xl shadow-sm" disabled={saving}>
            {saving ? "Saving…" : mode === "create" ? "Create user" : "Save changes"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border bg-card p-5 lg:col-span-7">
          <div className="mb-4">
            <div className="text-base font-semibold">Profile</div>
            <div className="text-sm text-muted-foreground">
              Identity and account status.
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={user?.name ?? ""}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contact</Label>
              <Input
                id="contact"
                name="contact"
                required
                defaultValue={user?.contact ?? ""}
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
                defaultValue={user?.email ?? ""}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                required
                defaultValue={user?.username ?? ""}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="password">
                Password{" "}
                {mode === "edit" ? (
                  <span className="font-normal text-muted-foreground">
                    (leave blank to keep current)
                  </span>
                ) : null}
              </Label>
              <PasswordInput
                id="password"
                name="password"
                required={mode === "create"}
                autoComplete="new-password"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                value={roleDraft}
                onChange={(e) => {
                  const next = e.target.value as
                    | "superadmin"
                    | "admin"
                    | "moderator";
                  if (next === "superadmin") {
                    setModuleAccessForm(defaultModuleAccessFormState());
                  } else if (roleDraft === "superadmin") {
                    setModuleAccessForm(defaultModuleAccessFormState());
                  }
                  setRoleDraft(next);
                }}
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
                defaultValue={user?.status ?? "active"}
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
        </section>

        <section className="rounded-2xl border bg-card p-5 lg:col-span-5">
          <div className="mb-4">
            <div className="text-base font-semibold">Access</div>
            <div className="text-sm text-muted-foreground">
              Department scope and module permissions.
            </div>
          </div>

          <div className="space-y-2">
            <Label>Department access</Label>
            <p className="text-xs text-muted-foreground">
              For admin and moderator, select one or more publicity departments to
              limit dashboards and lists. Leave none checked for access to all
              departments. Superadmin always has full access.
            </p>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-input bg-background p-2 text-sm">
              {deptLoading ? (
                <span className="text-muted-foreground">Loading departments…</span>
              ) : deptError ? (
                <span className="text-destructive">{deptError}</span>
              ) : deptOptions.length === 0 ? (
                <span className="text-muted-foreground">
                  No publicity departments found. Add them under Administration →{" "}
                  Departments first.
                </span>
              ) : (
                <ul className="space-y-1.5">
                  {deptOptions.map((d) => {
                    const checked = selectedDeptIds.includes(d._id);
                    return (
                      <li key={d._id} className="flex items-center gap-2">
                        <input
                          id={`dept-${d._id}`}
                          type="checkbox"
                          className="size-4 rounded border-input"
                          checked={checked}
                          onChange={() => {
                            setSelectedDeptIds((prev) =>
                              checked
                                ? prev.filter((x) => x !== d._id)
                                : [...prev, d._id],
                            );
                          }}
                        />
                        <label
                          htmlFor={`dept-${d._id}`}
                          className="cursor-pointer leading-tight"
                        >
                          {d.name}
                          {d.code ? (
                            <span className="text-muted-foreground">
                              {" "}
                              ({d.code})
                            </span>
                          ) : null}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <Label>Module access</Label>
            {isSuperadmin ? (
              <p className="text-xs text-muted-foreground">
                Superadmin always has full edit access on every module (view,
                change, and export where available).
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Edit</span>{" "}
                  allows viewing, updating, and downloading or exporting where the
                  app supports it.{" "}
                  <span className="font-medium text-foreground">View</span> is
                  read-only: lists and details are visible, but create, edit,
                  delete, and exports are blocked.
                </p>
                <div className="rounded-2xl border bg-background p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                      None:{" "}
                      <span className="font-medium text-foreground">
                        {levelCounts.none}
                      </span>
                      {" · "}View:{" "}
                      <span className="font-medium text-foreground">
                        {levelCounts.view}
                      </span>
                      {" · "}Edit:{" "}
                      <span className="font-medium text-foreground">
                        {levelCounts.edit}
                      </span>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                          />
                        }
                      >
                        Configure modules
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[22rem] rounded-xl p-2">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Access level</DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          {(
                            [
                              { level: "none", label: "None", hint: "No access" },
                              {
                                level: "view",
                                label: "View only",
                                hint: "Read-only",
                              },
                              {
                                level: "edit",
                                label: "Edit",
                                hint: "View + update + export",
                              },
                            ] as const
                          ).map(({ level, label, hint }) => (
                            <DropdownMenuSub key={level}>
                              <DropdownMenuSubTrigger className="rounded-lg">
                                <span className="font-medium">{label}</span>
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {hint}
                                </span>
                                <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                  {levelCounts[level]}
                                </span>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="w-[22rem] rounded-xl p-2">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel>
                                    {label} modules
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {APP_MODULE_IDS.map((id) => {
                                    const checked =
                                      moduleAccessForm[id] === level;
                                    return (
                                      <DropdownMenuCheckboxItem
                                        key={id}
                                        checked={checked}
                                        onCheckedChange={() => {
                                          setModuleAccessForm((prev) => ({
                                            ...prev,
                                            [id]: checked ? "edit" : level,
                                          }));
                                        }}
                                      >
                                        {MODULE_LABELS[id]}
                                      </DropdownMenuCheckboxItem>
                                    );
                                  })}
                                </DropdownMenuGroup>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          ))}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </form>
  );
}

