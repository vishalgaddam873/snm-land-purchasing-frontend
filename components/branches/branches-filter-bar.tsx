"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  DepartmentSearchableSelect,
  type DepartmentSelectOption,
} from "@/components/branches/department-searchable-select";
import {
  SectorSearchableSelect,
  type SectorSelectOption,
} from "@/components/branches/sector-searchable-select";
import {
  ZoneSearchableSelect,
  type ZoneSelectOption,
} from "@/components/branches/zone-searchable-select";
import { labelFromSnake } from "@/components/properties/property-helpers";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal } from "lucide-react";
import * as React from "react";

export type BranchListFilterValues = {
  departmentId: string;
  zoneId: string;
  sectorId: string;
  status: string;
};

export const EMPTY_BRANCH_LIST_FILTERS: BranchListFilterValues = {
  departmentId: "",
  zoneId: "",
  sectorId: "",
  status: "",
};

const STATUS_FILTER_ALL = "__branch_status_all__";

export function countActiveBranchFilters(f: BranchListFilterValues): number {
  return (
    (f.departmentId ? 1 : 0) +
    (f.zoneId ? 1 : 0) +
    (f.sectorId ? 1 : 0) +
    (f.status ? 1 : 0)
  );
}

function zoneDeptId(z: ZoneSelectOption): string {
  return z.departmentId != null && z.departmentId !== ""
    ? String(z.departmentId)
    : "";
}

function sortZonesForSelect(zones: ZoneSelectOption[]): ZoneSelectOption[] {
  return [...zones].sort((x, y) =>
    (x.zoneNumber ?? "").localeCompare(y.zoneNumber ?? "", undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

function FilterField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

const selectTriggerClass =
  "h-10 w-full rounded-xl border-border/80 bg-background text-[13px] shadow-sm";

type BranchesFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  appliedFilters: BranchListFilterValues;
  onApplyFilters: (next: BranchListFilterValues) => void;
  onClearAll: () => void;
  departments: DepartmentSelectOption[];
  departmentsLoading: boolean;
  departmentsFetchError: string | null;
  zones: ZoneSelectOption[];
  zonesLoading: boolean;
  zonesFetchError: string | null;
  /** Shown on the same row as the search field (e.g. bulk Excel). */
  exportAction?: React.ReactNode;
  className?: string;
};

export function BranchesFilterBar({
  search,
  onSearchChange,
  appliedFilters,
  onApplyFilters,
  onClearAll,
  departments,
  departmentsLoading,
  departmentsFetchError,
  zones,
  zonesLoading,
  zonesFetchError,
  exportAction,
  className,
}: BranchesFilterBarProps) {
  const [filterDialogOpen, setFilterDialogOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] =
    React.useState<BranchListFilterValues>(appliedFilters);
  const [filterSectors, setFilterSectors] = React.useState<
    SectorSelectOption[]
  >([]);
  const [sectorsLoading, setSectorsLoading] = React.useState(false);
  const [sectorsFetchError, setSectorsFetchError] = React.useState<
    string | null
  >(null);

  const sortedZones = React.useMemo(() => sortZonesForSelect(zones), [zones]);

  const sortedDepartments = React.useMemo(
    () =>
      [...departments].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [departments],
  );

  const zonesForDeptPicker = React.useMemo(() => {
    if (!draftFilters.departmentId) return sortedZones;
    return sortedZones.filter(
      (z) => zoneDeptId(z) === draftFilters.departmentId,
    );
  }, [sortedZones, draftFilters.departmentId]);

  const departmentTriggerLabel = React.useMemo(() => {
    if (!draftFilters.departmentId) return "All departments";
    if (departmentsLoading) return "Loading…";
    const d = sortedDepartments.find(
      (x) => x._id === draftFilters.departmentId,
    );
    return d ? `${d.name} (${d.code})` : "Unknown department";
  }, [draftFilters.departmentId, sortedDepartments, departmentsLoading]);

  const zoneTriggerLabel = React.useMemo(() => {
    if (!draftFilters.zoneId) return "All zones";
    if (zonesLoading) return "Loading…";
    const z = zonesForDeptPicker.find((x) => x._id === draftFilters.zoneId);
    return z ? `${z.name} (${z.zoneNumber})` : "Unknown zone";
  }, [draftFilters.zoneId, zonesForDeptPicker, zonesLoading]);

  React.useEffect(() => {
    if (!filterDialogOpen || !draftFilters.zoneId.trim()) {
      setFilterSectors([]);
      setSectorsFetchError(null);
      if (filterDialogOpen && !draftFilters.zoneId.trim()) {
        setSectorsLoading(false);
      }
      return;
    }
    let cancelled = false;
    setSectorsLoading(true);
    setSectorsFetchError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/sectors/for-select?zoneId=${encodeURIComponent(draftFilters.zoneId)}`,
          { cache: "no-store" },
        );
        const data = await res.json().catch(() => []);
        if (cancelled) return;
        if (res.ok && Array.isArray(data)) {
          setFilterSectors(data as SectorSelectOption[]);
        } else {
          setFilterSectors([]);
          setSectorsFetchError("Could not load sectors.");
        }
      } catch {
        if (!cancelled) {
          setFilterSectors([]);
          setSectorsFetchError("Could not load sectors.");
        }
      } finally {
        if (!cancelled) setSectorsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterDialogOpen, draftFilters.zoneId]);

  const sectorTriggerLabel = React.useMemo(() => {
    if (!draftFilters.zoneId.trim()) return "Select a zone first";
    if (!draftFilters.sectorId) return "All sectors";
    if (sectorsLoading) return "Loading…";
    const s = filterSectors.find((x) => x._id === draftFilters.sectorId);
    if (!s) return "Unknown sector";
    return s.sectorNumber?.trim()
      ? `${s.name} (${s.sectorNumber})`
      : s.name;
  }, [
    draftFilters.sectorId,
    draftFilters.zoneId,
    filterSectors,
    sectorsLoading,
  ]);

  const statusTriggerLabel = React.useMemo(
    () =>
      draftFilters.status
        ? labelFromSnake(draftFilters.status)
        : "All statuses",
    [draftFilters.status],
  );

  const appliedFilterCount = countActiveBranchFilters(appliedFilters);
  const hasSearch = search.trim() !== "";
  const hasAnyActive = hasSearch || appliedFilterCount > 0;

  function saveFilters() {
    onApplyFilters({ ...draftFilters });
    setFilterDialogOpen(false);
  }

  function resetDraft() {
    setDraftFilters({ ...EMPTY_BRANCH_LIST_FILTERS });
  }

  function patchDraft(patch: Partial<BranchListFilterValues>) {
    setDraftFilters((f) => {
      const next = { ...f, ...patch };
      if (
        patch.departmentId !== undefined &&
        patch.departmentId !== f.departmentId
      ) {
        if (next.zoneId) {
          const z = sortedZones.find((x) => x._id === next.zoneId);
          if (!z) {
            next.zoneId = "";
            next.sectorId = "";
          } else if (
            next.departmentId &&
            zoneDeptId(z) !== next.departmentId
          ) {
            next.zoneId = "";
            next.sectorId = "";
          }
        }
      }
      if (patch.zoneId !== undefined && patch.zoneId !== f.zoneId) {
        next.sectorId = "";
      }
      return next;
    });
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex w-full min-w-0 flex-row items-stretch gap-2 sm:gap-3">
        <div
          className={cn(
            "flex h-12 min-w-0 flex-1 items-stretch gap-0 overflow-hidden rounded-full border border-border/80 bg-muted/40 shadow-sm ring-1 ring-black/5 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 dark:bg-muted/25",
          )}
        >
          <label
            htmlFor="branches-search"
            className="relative flex min-w-0 flex-1 items-center"
          >
            <Search
              className="pointer-events-none absolute left-4 size-[18px] text-muted-foreground"
              aria-hidden
            />
            <Input
              id="branches-search"
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search branches…"
              className={cn(
                "h-full min-w-0 flex-1 rounded-none border-0 bg-transparent pl-11 pr-3 text-[15px] shadow-none ring-0 focus-visible:ring-0 md:text-[15px]",
                "placeholder:text-muted-foreground/75",
              )}
              autoComplete="off"
            />
          </label>
          <div className="hidden w-px shrink-0 self-stretch bg-border/60 sm:block" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setFilterDialogOpen(true)}
            className={cn(
              "h-12 w-12 shrink-0 rounded-none rounded-r-full hover:bg-muted/80",
              appliedFilterCount > 0 && "text-primary",
            )}
            aria-label={`Open filters${appliedFilterCount > 0 ? ` (${appliedFilterCount} active)` : ""}`}
          >
            <span className="relative inline-flex">
              <SlidersHorizontal className="size-[18px]" aria-hidden />
              {appliedFilterCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {appliedFilterCount > 8 ? "9+" : appliedFilterCount}
                </span>
              ) : null}
            </span>
          </Button>
        </div>
        {exportAction ? (
          <div className="flex shrink-0 items-stretch">{exportAction}</div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Search updates as you type. Use the filter control to narrow by
          department, zone, sector, and status — then{" "}
          <span className="font-medium text-foreground/90">Save filters</span> to
          apply.
        </p>
        {hasAnyActive ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
            onClick={onClearAll}
          >
            Clear search & filters
          </Button>
        ) : null}
      </div>

      {departmentsFetchError ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {departmentsFetchError}
        </p>
      ) : null}
      {zonesFetchError ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {zonesFetchError}
        </p>
      ) : null}

      <Dialog
        open={filterDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            const initial = { ...appliedFilters };
            if (initial.sectorId && !initial.zoneId.trim()) {
              initial.sectorId = "";
            }
            setDraftFilters(initial);
          }
          setFilterDialogOpen(open);
        }}
      >
        <DialogContent
          className="flex max-h-[min(85vh,40rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg"
          showCloseButton
        >
          <DialogHeader className="space-y-1 border-b border-border/60 px-5 py-4 text-left">
            <DialogTitle className="text-base font-semibold">Filters</DialogTitle>
            <DialogDescription className="text-sm">
              Adjust fields below, then save to update the table. Closing without
              saving keeps your current list.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-1 gap-4">
              <FilterField
                label="Department"
                htmlFor="dlg-branch-filter-department"
              >
                <DepartmentSearchableSelect
                  id="dlg-branch-filter-department"
                  departments={sortedDepartments}
                  disabled={departmentsLoading}
                  value={draftFilters.departmentId}
                  onChange={(departmentId) => patchDraft({ departmentId })}
                  triggerLabel={departmentTriggerLabel}
                  showAllOption
                  allOptionLabel="All departments"
                  triggerClassName={selectTriggerClass}
                  menuZIndexClass="z-[400]"
                />
              </FilterField>

              <FilterField label="Zone" htmlFor="dlg-branch-filter-zone">
                <ZoneSearchableSelect
                  id="dlg-branch-filter-zone"
                  zones={zonesForDeptPicker}
                  disabled={zonesLoading}
                  value={draftFilters.zoneId}
                  onChange={(zoneId) => patchDraft({ zoneId })}
                  triggerLabel={zoneTriggerLabel}
                  showAllOption
                  allOptionLabel="All zones"
                  triggerClassName={selectTriggerClass}
                  menuZIndexClass="z-[400]"
                />
              </FilterField>

              <FilterField label="Sector" htmlFor="dlg-branch-filter-sector">
                <SectorSearchableSelect
                  id="dlg-branch-filter-sector"
                  sectors={filterSectors}
                  disabled={
                    !draftFilters.zoneId.trim() ||
                    zonesLoading ||
                    sectorsLoading
                  }
                  value={draftFilters.sectorId}
                  onChange={(sectorId) => patchDraft({ sectorId })}
                  triggerLabel={sectorTriggerLabel}
                  showAllOption
                  allOptionLabel="All sectors"
                  triggerClassName={selectTriggerClass}
                  menuZIndexClass="z-[400]"
                />
              </FilterField>
              {sectorsFetchError && filterDialogOpen && draftFilters.zoneId ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {sectorsFetchError}
                </p>
              ) : null}

              <FilterField label="Record status" htmlFor="dlg-branch-filter-status">
                <Select
                  value={draftFilters.status || STATUS_FILTER_ALL}
                  onValueChange={(v) =>
                    patchDraft({
                      status: v === STATUS_FILTER_ALL ? "" : (v ?? ""),
                    })
                  }
                >
                  <SelectTrigger
                    id="dlg-branch-filter-status"
                    className={selectTriggerClass}
                  >
                    <SelectValue placeholder="All statuses">
                      {statusTriggerLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={STATUS_FILTER_ALL}>
                      All statuses
                    </SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
            </div>
          </div>

          <DialogFooter className="-mx-0 -mb-0 mt-0 flex-col gap-2 rounded-none rounded-b-2xl border-t border-border/60 bg-muted/20 px-5 py-4 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl sm:w-auto"
              onClick={resetDraft}
            >
              Clear Filters
            </Button>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl"
                onClick={() => setFilterDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-foreground text-background shadow-sm hover:bg-foreground/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
                onClick={saveFilters}
              >
                Save filters
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
