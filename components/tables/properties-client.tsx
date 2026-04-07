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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PaginatedTableShell } from "@/components/tables/paginated-table-shell";
import { isPaginatedList } from "@/lib/api/paginated-list";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/hooks/use-client-pagination";
import { Pencil, Plus, Trash2 } from "lucide-react";
import * as React from "react";

type ZoneMini = { _id: string; name: string; zoneNumber: string };

type PopulatedBranch = {
  _id: string;
  name: string;
  zoneId?: ZoneMini | string;
};

type BranchOption = {
  _id: string;
  name: string;
  status?: string;
};

type PropertyRow = {
  _id: string;
  propertyName: string;
  branchId: PopulatedBranch | string;
  areaHeld: string;
  constructionStatus: string;
  locatedAt: string;
  bhawanType: string;
  remarks: string;
  status: "active" | "inactive" | "deleted";
  registrationType: string;
  verificationStatus: string;
  verifiedAt: string | null;
  verifiedBy:
    | { _id: string; name: string; email?: string }
    | string
    | null
    | undefined;
  internalNotes: string;
};

function bhawanLabel(v: string): string {
  const m: Record<string, string> = {
    bhawan: "Bhawan",
    shed: "Shed",
    self_made_shed: "Self made shed",
    building: "Building",
    na: "NA",
  };
  return m[v] ?? v;
}

function constructionLabel(v: string): string {
  const m: Record<string, string> = {
    not_constructed: "Not constructed",
    under_construction: "Under construction",
    constructed: "Constructed",
  };
  return m[v] ?? v;
}

function registrationLabel(v: string): string {
  const m: Record<string, string> = {
    registered: "Registered",
    to_be_registered: "To be registered",
  };
  return m[v] ?? v;
}

function verifiedByLabel(p: PropertyRow): string {
  const vb = p.verifiedBy;
  if (vb && typeof vb === "object" && "name" in vb) {
    return vb.name;
  }
  return "—";
}

function resolvedZone(p: PropertyRow): ZoneMini | null {
  const b = p.branchId;
  if (b && typeof b === "object" && "zoneId" in b) {
    const z = b.zoneId;
    if (
      z &&
      typeof z === "object" &&
      "name" in z &&
      "zoneNumber" in z
    ) {
      return z as ZoneMini;
    }
  }
  return null;
}

function zoneNumberLabel(p: PropertyRow): string {
  const z = resolvedZone(p);
  return z?.zoneNumber != null && z.zoneNumber !== "" ? z.zoneNumber : "—";
}

function zoneNameLabel(p: PropertyRow): string {
  const z = resolvedZone(p);
  return z?.name != null && z.name !== "" ? z.name : "—";
}

function branchNameOnly(p: PropertyRow): string {
  const b = p.branchId;
  if (b && typeof b === "object" && "name" in b) {
    return b.name;
  }
  return "—";
}

function branchIdValue(p: PropertyRow): string {
  const b = p.branchId;
  if (b && typeof b === "object" && "_id" in b) {
    return String(b._id);
  }
  return String(b ?? "");
}

function branchOptionId(b: BranchOption): string {
  return b._id != null && b._id !== "" ? String(b._id) : "";
}

function sortBranchesForSelect(list: BranchOption[]): BranchOption[] {
  return [...list].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

const FILTER_ALL_BRANCHES = "__all_branches__";

async function fetchBranchesForSelect(): Promise<BranchOption[]> {
  const qs = new URLSearchParams({ page: "1", limit: "100" });
  const res = await fetch(`/api/branches?${qs}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  if (!data?.data || !Array.isArray(data.data)) return [];
  return (data.data as BranchOption[]).filter(
    (b) => b.status !== "deleted",
  );
}

const selectClass =
  "flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

export function PropertiesClient({ canManage }: { canManage: boolean }) {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<PropertyRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [edit, setEdit] = React.useState<PropertyRow | null>(null);
  const [toDelete, setToDelete] = React.useState<PropertyRow | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [branches, setBranches] = React.useState<BranchOption[]>([]);
  const [branchesLoading, setBranchesLoading] = React.useState(true);
  const [branchesFetchError, setBranchesFetchError] = React.useState<
    string | null
  >(null);
  const [filterBranchId, setFilterBranchId] = React.useState("");
  const [dialogBranchId, setDialogBranchId] = React.useState("");

  const [listPage, setListPage] = React.useState(1);
  const [listMeta, setListMeta] = React.useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);

  const sortedBranches = React.useMemo(
    () => sortBranchesForSelect(branches),
    [branches],
  );

  const fetchPage = React.useCallback(
    async (page: number, branchFilter: string) => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          page: String(page),
          limit: String(DEFAULT_TABLE_PAGE_SIZE),
        });
        if (branchFilter) qs.set("branchId", branchFilter);
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

  React.useEffect(() => {
    void fetchPage(listPage, filterBranchId);
  }, [listPage, filterBranchId, fetchPage]);

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
    if (open) {
      setDialogBranchId(edit ? branchIdValue(edit) : "");
    }
  }, [open, edit]);

  function closeForm() {
    setFormError(null);
    setOpen(false);
    setEdit(null);
    setDialogBranchId("");
  }

  function onFormDialogOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setEdit(null);
      setFormError(null);
      setDialogBranchId("");
    } else {
      setFormError(null);
    }
  }

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const propertyName = String(form.get("propertyName") ?? "").trim();
    const areaHeld = String(form.get("areaHeld") ?? "").trim();
    const locatedAt = String(form.get("locatedAt") ?? "").trim();

    if (!dialogBranchId.trim()) {
      setFormError("Branch is required.");
      return;
    }

    if (!propertyName || !areaHeld || !locatedAt) {
      setFormError("Name, area held, and location are required.");
      return;
    }

    const body: Record<string, unknown> = {
      propertyName,
      branchId: dialogBranchId.trim(),
      areaHeld,
      constructionStatus: String(form.get("constructionStatus")),
      locatedAt,
      bhawanType: String(form.get("bhawanType")),
      remarks: String(form.get("remarks") ?? "").trim(),
      registrationType: String(form.get("registrationType")),
    };

    if (canManage) {
      body.internalNotes = String(form.get("internalNotes") ?? "").trim();
    }
    if (edit && canManage) {
      body.status = String(form.get("status") ?? "active");
      body.verificationStatus = String(form.get("verificationStatus"));
    }

    const url = edit ? `/api/properties/${edit._id}` : "/api/properties";
    const method = edit ? "PATCH" : "POST";

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
    await fetchPage(listPage, filterBranchId);
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
      await fetchPage(listPage, filterBranchId);
    } finally {
      setDeleteLoading(false);
    }
  }

  const colCount = canManage ? 14 : 13;
  const pageTotal = listMeta?.total ?? 0;
  const shellPage = listMeta?.page ?? listPage;
  const limit = listMeta?.limit ?? DEFAULT_TABLE_PAGE_SIZE;
  const pageCount = listMeta?.totalPages ?? 1;
  const rangeFrom = pageTotal === 0 ? 0 : (shellPage - 1) * limit + 1;
  const rangeTo = Math.min(shellPage * limit, pageTotal);

  return (
    <div className="space-y-4">
      <div
        className={
          canManage
            ? "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            : ""
        }
      >
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {canManage ? "All properties" : "Property register"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "Add entries and update verification status."
              : "Read-only list. Superadmins can add or edit records."}
          </p>
        </div>
        {canManage ? (
        <div className="flex justify-end sm:justify-end">
          <Dialog open={open} onOpenChange={onFormDialogOpenChange}>
            <DialogTrigger
              render={
                <Button
                  type="button"
                  className="rounded-xl shadow-sm"
                  onClick={() => setEdit(null)}
                />
              }
            >
              <Plus className="mr-2 size-4" />
              Add property
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {edit ? "Edit property" : "Add property"}
                </DialogTitle>
                <DialogDescription>
                  Fields mirror the property register: area, location, bhawan
                  type, and verification.
                </DialogDescription>
              </DialogHeader>
              <form
                key={edit?._id ?? "new"}
                className="space-y-4"
                onSubmit={(e) => void onSave(e)}
              >
                <div className="space-y-2">
                  <Label htmlFor="propertyName">Property name</Label>
                  <Input
                    id="propertyName"
                    name="propertyName"
                    required
                    defaultValue={edit?.propertyName ?? ""}
                    className="rounded-xl"
                    placeholder="e.g. Sector 12 community centre"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property-branchId">Branch</Label>
                  <Select
                    value={dialogBranchId || undefined}
                    onValueChange={(v) => setDialogBranchId(v ?? "")}
                  >
                    <SelectTrigger
                      id="property-branchId"
                      className="h-10 w-full rounded-xl"
                    >
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {sortedBranches.map((b) => {
                        const id = branchOptionId(b);
                        if (!id) return null;
                        return (
                          <SelectItem key={id} value={id}>
                            {b.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="areaHeld">Details of properties held (area)</Label>
                  <Input
                    id="areaHeld"
                    name="areaHeld"
                    required
                    defaultValue={edit?.areaHeld ?? ""}
                    className="rounded-xl"
                    placeholder='e.g. "2.5 acres" or "1200 sq ft"'
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="constructionStatus">Construction status</Label>
                  <select
                    id="constructionStatus"
                    name="constructionStatus"
                    className={selectClass}
                    defaultValue={
                      edit?.constructionStatus ?? "not_constructed"
                    }
                  >
                    <option value="not_constructed">Not constructed</option>
                    <option value="under_construction">Under construction</option>
                    <option value="constructed">Constructed</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locatedAt">Located at</Label>
                  <Textarea
                    id="locatedAt"
                    name="locatedAt"
                    required
                    rows={2}
                    defaultValue={edit?.locatedAt ?? ""}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bhawanType">Bhawan type</Label>
                  <select
                    id="bhawanType"
                    name="bhawanType"
                    className={selectClass}
                    defaultValue={edit?.bhawanType ?? "bhawan"}
                  >
                    <option value="bhawan">Bhawan</option>
                    <option value="shed">Shed</option>
                    <option value="self_made_shed">Self made shed</option>
                    <option value="building">Building</option>
                    <option value="na">NA</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationType">Registration</Label>
                  <select
                    id="registrationType"
                    name="registrationType"
                    className={selectClass}
                    defaultValue={edit?.registrationType ?? "to_be_registered"}
                  >
                    <option value="registered">Registered</option>
                    <option value="to_be_registered">To be registered</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    name="remarks"
                    rows={2}
                    defaultValue={edit?.remarks ?? ""}
                    className="rounded-xl"
                  />
                </div>
                {canManage ? (
                  <div className="space-y-2">
                    <Label htmlFor="internalNotes">Internal notes</Label>
                    <Textarea
                      id="internalNotes"
                      name="internalNotes"
                      rows={2}
                      defaultValue={edit?.internalNotes ?? ""}
                      className="rounded-xl"
                    />
                  </div>
                ) : null}
                {edit && canManage ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="status">Record status</Label>
                      <select
                        id="status"
                        name="status"
                        className={selectClass}
                        defaultValue={edit.status}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verificationStatus">Verification</Label>
                      <select
                        id="verificationStatus"
                        name="verificationStatus"
                        className={selectClass}
                        defaultValue={edit.verificationStatus}
                      >
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                      </select>
                    </div>
                  </div>
                ) : null}
                {formError ? (
                  <p className="text-sm text-destructive">{formError}</p>
                ) : null}
                <div className="flex justify-end gap-2 pt-2">
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
        </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="property-branch-filter">Filter by branch</Label>
        <Select
          value={filterBranchId ? filterBranchId : FILTER_ALL_BRANCHES}
          disabled={branchesLoading}
          onValueChange={(v) => {
            const next =
              v == null || v === FILTER_ALL_BRANCHES ? "" : v;
            setFilterBranchId(next);
            setListPage(1);
          }}
        >
          <SelectTrigger
            id="property-branch-filter"
            className="h-10 w-full rounded-xl"
          >
            <SelectValue
              placeholder={
                branchesLoading ? "Loading branches…" : "All branches"
              }
            >
              {filterBranchId
                ? (() => {
                    const br = sortedBranches.find(
                      (b) => branchOptionId(b) === filterBranchId,
                    );
                    return br?.name ?? "All branches";
                  })()
                : "All branches"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={FILTER_ALL_BRANCHES}>All branches</SelectItem>
            {sortedBranches.map((b) => {
              const id = branchOptionId(b);
              if (!id) return null;
              return (
                <SelectItem key={id} value={id}>
                  {b.name}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {branchesFetchError ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {branchesFetchError}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      ) : (
        <PaginatedTableShell
          page={shellPage}
          setPage={setListPage}
          pageCount={pageCount}
          total={pageTotal}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {canManage ? (
                  <TableHead className="w-[100px]">Actions</TableHead>
                ) : null}
                <TableHead className="w-[72px] text-right md:text-left">
                  Zone no.
                </TableHead>
                <TableHead className="min-w-[100px]">Zone</TableHead>
                <TableHead className="min-w-[120px]">Branch</TableHead>
                <TableHead className="min-w-[140px]">Property details</TableHead>
                <TableHead className="min-w-[120px]">Area</TableHead>
                <TableHead className="min-w-[140px]">Location</TableHead>
                <TableHead className="min-w-[180px] max-w-[260px]">
                  Remarks
                </TableHead>
                <TableHead>Bhawan</TableHead>
                <TableHead className="hidden md:table-cell">Construction</TableHead>
                <TableHead className="hidden lg:table-cell">Registration</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead className="hidden sm:table-cell">Verified by</TableHead>
                <TableHead className="w-[90px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p._id}>
                  {canManage ? (
                    <TableCell>
                      <div className="inline-flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => {
                            setEdit(p);
                            setOpen(true);
                            setFormError(null);
                          }}
                          aria-label="Edit property"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setToDelete(p)}
                          aria-label="Delete property"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                  <TableCell className="text-right tabular-nums md:text-left">
                    {zoneNumberLabel(p)}
                  </TableCell>
                  <TableCell className="max-w-[140px] truncate text-muted-foreground">
                    {zoneNameLabel(p)}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate font-medium">
                    {branchNameOnly(p)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate font-medium">
                    {p.propertyName}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-muted-foreground">
                    {p.areaHeld}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {p.locatedAt}
                  </TableCell>
                  <TableCell
                    className="max-w-[260px] truncate text-left text-sm text-muted-foreground"
                    title={
                      p.remarks?.trim()
                        ? p.remarks.replace(/\r?\n/g, " ")
                        : undefined
                    }
                  >
                    {p.remarks?.trim()
                      ? p.remarks.replace(/\r?\n/g, " ")
                      : "—"}
                  </TableCell>
                  <TableCell>{bhawanLabel(p.bhawanType)}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {constructionLabel(p.constructionStatus)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {registrationLabel(p.registrationType)}
                  </TableCell>
                  <TableCell className="capitalize">{p.verificationStatus}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {verifiedByLabel(p)}
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {p.status}
                  </TableCell>
                </TableRow>
              ))}
              {pageTotal === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colCount}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    No properties yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </PaginatedTableShell>
      )}

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
