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
import { labelFromSnake } from "@/components/properties/property-helpers";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal } from "lucide-react";
import * as React from "react";

export type ZoneListFilterValues = {
  departmentId: string;
  status: string;
};

export const EMPTY_ZONE_LIST_FILTERS: ZoneListFilterValues = {
  departmentId: "",
  status: "",
};

const STATUS_FILTER_ALL = "__zone_status_all__";

export function countActiveZoneFilters(f: ZoneListFilterValues): number {
  return (f.departmentId ? 1 : 0) + (f.status ? 1 : 0);
}

function FilterField({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
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

function sortDepartments(
  departments: DepartmentSelectOption[],
): DepartmentSelectOption[] {
  return [...departments].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

type ZonesFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  appliedFilters: ZoneListFilterValues;
  onApplyFilters: (next: ZoneListFilterValues) => void;
  onClearAll: () => void;
  departments: DepartmentSelectOption[];
  departmentsLoading: boolean;
  departmentsFetchError: string | null;
  className?: string;
};

export function ZonesFilterBar({
  search,
  onSearchChange,
  appliedFilters,
  onApplyFilters,
  onClearAll,
  departments,
  departmentsLoading,
  departmentsFetchError,
  className,
}: ZonesFilterBarProps) {
  const [filterDialogOpen, setFilterDialogOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] =
    React.useState<ZoneListFilterValues>(appliedFilters);

  const sortedDepartments = React.useMemo(
    () => sortDepartments(departments),
    [departments],
  );

  const departmentTriggerLabel = React.useMemo(() => {
    if (!draftFilters.departmentId) return "All departments";
    if (departmentsLoading) return "Loading…";
    const d = sortedDepartments.find(
      (x) => x._id === draftFilters.departmentId,
    );
    return d ? `${d.name} (${d.code})` : "Unknown department";
  }, [draftFilters.departmentId, sortedDepartments, departmentsLoading]);

  const statusTriggerLabel = React.useMemo(
    () =>
      draftFilters.status
        ? labelFromSnake(draftFilters.status)
        : "All statuses",
    [draftFilters.status],
  );

  const appliedFilterCount = countActiveZoneFilters(appliedFilters);
  const hasSearch = search.trim() !== "";
  const hasAnyActive = hasSearch || appliedFilterCount > 0;

  function saveFilters() {
    onApplyFilters({ ...draftFilters });
    setFilterDialogOpen(false);
  }

  function resetDraft() {
    setDraftFilters({ ...EMPTY_ZONE_LIST_FILTERS });
  }

  function patchDraft(patch: Partial<ZoneListFilterValues>) {
    setDraftFilters((f) => ({ ...f, ...patch }));
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "flex h-12 w-full items-stretch gap-0 overflow-hidden rounded-full border border-border/80 bg-muted/40 shadow-sm ring-1 ring-black/5 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 dark:bg-muted/25",
        )}
      >
        <label
          htmlFor="zones-search"
          className="relative flex min-w-0 flex-1 items-center"
        >
          <Search
            className="pointer-events-none absolute left-4 size-[18px] text-muted-foreground"
            aria-hidden
          />
          <Input
            id="zones-search"
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search zones…"
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Search updates as you type. Use filters for department and status,
          then{" "}
          <span className="font-medium text-foreground/90">Save filters</span>{" "}
          to apply.
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

      <Dialog
        open={filterDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setDraftFilters({ ...appliedFilters });
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
              Adjust fields below, then save to update the table.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FilterField
                label="Department"
                htmlFor="dlg-zone-filter-department"
                className="sm:col-span-2"
              >
                <DepartmentSearchableSelect
                  id="dlg-zone-filter-department"
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

              <FilterField
                label="Record status"
                htmlFor="dlg-zone-filter-status"
                className="sm:col-span-2"
              >
                <Select
                  value={draftFilters.status || STATUS_FILTER_ALL}
                  onValueChange={(v) =>
                    patchDraft({
                      status: v === STATUS_FILTER_ALL ? "" : (v ?? ""),
                    })
                  }
                >
                  <SelectTrigger
                    id="dlg-zone-filter-status"
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
