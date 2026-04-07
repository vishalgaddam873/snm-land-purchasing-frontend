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
import { BranchSearchableSelect } from "@/components/properties/branch-searchable-select";
import {
  bhawanLabel,
  branchOptionId,
  constructionLabel,
  propertyTypeLabel,
  registrationLabel,
  sortBranchesForSelect,
  type BranchOption,
} from "@/components/properties/property-helpers";
import { cn } from "@/lib/utils";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { CheckIcon, ChevronDownIcon, Search, SlidersHorizontal } from "lucide-react";
import * as React from "react";

export type PropertyListFilterValues = {
  departmentId: string;
  zoneId: string;
  sectorId: string;
  branchId: string;
  propertyTypes: string[];
  statuses: string[];
  verificationStatuses: string[];
  registrationTypes: string[];
  constructionStatuses: string[];
  bhawanTypes: string[];
};

export const EMPTY_PROPERTY_LIST_FILTERS: PropertyListFilterValues = {
  departmentId: "",
  zoneId: "",
  sectorId: "",
  branchId: "",
  propertyTypes: [],
  statuses: [],
  verificationStatuses: [],
  registrationTypes: [],
  constructionStatuses: [],
  bhawanTypes: [],
};

export function countActivePropertyFilters(
  f: PropertyListFilterValues,
): number {
  return (
    (f.departmentId ? 1 : 0) +
    (f.zoneId ? 1 : 0) +
    (f.sectorId ? 1 : 0) +
    (f.branchId ? 1 : 0) +
    (f.propertyTypes.length ? 1 : 0) +
    (f.statuses.length ? 1 : 0) +
    (f.verificationStatuses.length ? 1 : 0) +
    (f.registrationTypes.length ? 1 : 0) +
    (f.constructionStatuses.length ? 1 : 0) +
    (f.bhawanTypes.length ? 1 : 0)
  );
}

type PropertiesFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  appliedFilters: PropertyListFilterValues;
  onApplyFilters: (next: PropertyListFilterValues) => void;
  onClearAll: () => void;
  branches: BranchOption[];
  branchesLoading: boolean;
  branchesFetchError: string | null;
  zones: ZoneSelectOption[];
  zonesLoading: boolean;
  zonesFetchError: string | null;
  departments: DepartmentSelectOption[];
  departmentsLoading: boolean;
  departmentsFetchError: string | null;
  /** Shown on the same row as the search field (e.g. Export). */
  exportAction?: React.ReactNode;
  className?: string;
};

function FilterField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <div>
        <Label
          htmlFor={htmlFor}
          className="text-xs font-medium text-muted-foreground"
        >
          {label}
        </Label>
        {hint ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground/90">{hint}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function toggleInList(list: string[], value: string): string[] {
  const set = new Set(list);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return [...set];
}

function multiSelectTriggerSummary(
  values: string[],
  options: { value: string; label: string }[],
  emptyLabel: string,
): string {
  if (values.length === 0) return emptyLabel;
  const labels = values.map(
    (v) => options.find((o) => o.value === v)?.label ?? v,
  );
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]}, ${labels[1]}`;
  return `${labels.length} selected`;
}

/** Multi-select shown inside a dropdown panel (trigger shows current selection). */
function EnumMultiSelectDropdown({
  id,
  options,
  values,
  onChange,
  emptyLabel,
  triggerClassName,
  menuZIndexClass = "z-[400]",
}: {
  id: string;
  options: { value: string; label: string }[];
  values: string[];
  onChange: (next: string[]) => void;
  emptyLabel: string;
  triggerClassName?: string;
  menuZIndexClass?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerLabel = React.useMemo(
    () => multiSelectTriggerSummary(values, options, emptyLabel),
    [values, options, emptyLabel],
  );

  return (
    <MenuPrimitive.Root open={open} onOpenChange={setOpen}>
      <MenuPrimitive.Trigger
        id={id}
        type="button"
        data-slot="filter-multi-trigger"
        className={cn(
          "flex h-10 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl border border-border/80 bg-background px-3 text-left text-[13px] shadow-sm outline-none",
          "transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
          triggerClassName,
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="line-clamp-1 flex-1 text-left leading-tight" title={triggerLabel}>
          {triggerLabel}
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground opacity-80 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </MenuPrimitive.Trigger>

      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner
          align="start"
          side="bottom"
          sideOffset={4}
          className={cn("isolate outline-none", menuZIndexClass)}
        >
          <MenuPrimitive.Popup
            className={cn(
              "flex max-h-72 min-w-(--anchor-width) w-(--anchor-width) max-w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl bg-popover py-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
              "origin-(--transform-origin) data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2",
            )}
          >
            <div
              className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-2 py-1.5"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <span className="text-[11px] font-medium text-muted-foreground">
                Select one or more
              </span>
              {values.length > 0 ? (
                <button
                  type="button"
                  className="text-[11px] font-medium text-primary hover:underline"
                  onClick={() => onChange([])}
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div
              role="listbox"
              aria-labelledby={id}
              aria-multiselectable="true"
              className="max-h-56 min-h-0 overflow-y-auto p-1"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {options.map((opt) => {
                const selected = values.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={cn(
                      "relative flex cursor-pointer items-center gap-2 rounded-md py-2 pr-8 pl-2 text-sm outline-none select-none",
                      "hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onChange(toggleInList(values, opt.value))}
                      className="size-4 shrink-0 rounded border-border text-primary accent-primary"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="line-clamp-2 flex-1 leading-snug">
                      {opt.label}
                    </span>
                    {selected ? (
                      <span className="pointer-events-none absolute right-2 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-primary">
                        <CheckIcon className="size-4" aria-hidden />
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}

const selectTriggerClass =
  "h-10 w-full rounded-xl border-border/80 bg-background text-[13px] shadow-sm";

function sortZonesForSelect(zones: ZoneSelectOption[]): ZoneSelectOption[] {
  return [...zones].sort((x, y) =>
    (x.zoneNumber ?? "").localeCompare(y.zoneNumber ?? "", undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

function zoneDeptId(z: ZoneSelectOption): string {
  return z.departmentId != null && z.departmentId !== ""
    ? String(z.departmentId)
    : "";
}

export function PropertiesFilterBar({
  search,
  onSearchChange,
  appliedFilters,
  onApplyFilters,
  onClearAll,
  branches,
  branchesLoading,
  branchesFetchError,
  zones,
  zonesLoading,
  zonesFetchError,
  departments,
  departmentsLoading,
  departmentsFetchError,
  exportAction,
  className,
}: PropertiesFilterBarProps) {
  const [filterDialogOpen, setFilterDialogOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] =
    React.useState<PropertyListFilterValues>(appliedFilters);
  const [filterSectors, setFilterSectors] = React.useState<
    SectorSelectOption[]
  >([]);
  const [sectorsLoading, setSectorsLoading] = React.useState(false);
  const [sectorsFetchError, setSectorsFetchError] = React.useState<
    string | null
  >(null);

  const sortedBranches = React.useMemo(
    () => sortBranchesForSelect(branches),
    [branches],
  );

  const sortedZones = React.useMemo(
    () => sortZonesForSelect(zones),
    [zones],
  );

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

  const branchTriggerLabel = React.useMemo(() => {
    if (!draftFilters.branchId) return "All branches";
    if (branchesLoading) return "Loading…";
    const b = sortedBranches.find(
      (x) => branchOptionId(x) === draftFilters.branchId,
    );
    return b?.name ?? "Unknown branch";
  }, [draftFilters.branchId, sortedBranches, branchesLoading]);

  const appliedFilterCount = countActivePropertyFilters(appliedFilters);
  const hasSearch = search.trim() !== "";
  const hasAnyActive = hasSearch || appliedFilterCount > 0;

  function saveFilters() {
    onApplyFilters({ ...draftFilters });
    setFilterDialogOpen(false);
  }

  function resetDraft() {
    setDraftFilters({ ...EMPTY_PROPERTY_LIST_FILTERS });
  }

  function patchDraft(patch: Partial<PropertyListFilterValues>) {
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
            htmlFor="properties-search"
            className="relative flex min-w-0 flex-1 items-center"
          >
            <Search
              className="pointer-events-none absolute left-4 size-[18px] text-muted-foreground"
              aria-hidden
            />
            <Input
              id="properties-search"
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search properties…"
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
          Search updates as you type. Open each filter dropdown to choose options
          (multi-select fields support several at once) — then{" "}
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

      {branchesFetchError ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {branchesFetchError}
        </p>
      ) : null}
      {zonesFetchError ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {zonesFetchError}
        </p>
      ) : null}
      {departmentsFetchError ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {departmentsFetchError}
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
          className="flex max-h-[min(85vh,40rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-xl"
          showCloseButton
        >
          <DialogHeader className="space-y-1 border-b border-border/60 px-5 py-4 text-left">
            <DialogTitle className="text-base font-semibold">
              Filters
            </DialogTitle>
            <DialogDescription className="text-sm">
              Adjust fields below, then save to update the table. Closing
              without saving keeps your current list.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FilterField
                label="Department"
                htmlFor="dlg-filter-department"
              >
                <DepartmentSearchableSelect
                  id="dlg-filter-department"
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

              <FilterField label="Zone" htmlFor="dlg-filter-zone">
                <ZoneSearchableSelect
                  id="dlg-filter-zone"
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

              <FilterField label="Sector" htmlFor="dlg-filter-sector">
                <SectorSearchableSelect
                  id="dlg-filter-sector"
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
                {sectorsFetchError &&
                filterDialogOpen &&
                draftFilters.zoneId ? (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {sectorsFetchError}
                  </p>
                ) : null}
              </FilterField>

              <FilterField label="Branch" htmlFor="dlg-filter-branch">
                <BranchSearchableSelect
                  id="dlg-filter-branch"
                  branches={sortedBranches}
                  disabled={branchesLoading}
                  value={draftFilters.branchId}
                  onChange={(branchId) => patchDraft({ branchId })}
                  triggerLabel={branchTriggerLabel}
                  showAllOption
                  allOptionLabel="All branches"
                  triggerClassName={selectTriggerClass}
                  menuZIndexClass="z-[400]"
                />
              </FilterField>

              <FilterField label="Property type" htmlFor="dlg-filter-ptype">
                <EnumMultiSelectDropdown
                  id="dlg-filter-ptype"
                  emptyLabel="All types"
                  options={[
                    { value: "main_branch", label: propertyTypeLabel("main_branch") },
                    {
                      value: "additional_unit",
                      label: propertyTypeLabel("additional_unit"),
                    },
                    {
                      value: "adjoining_plot",
                      label: propertyTypeLabel("adjoining_plot"),
                    },
                  ]}
                  values={draftFilters.propertyTypes}
                  onChange={(propertyTypes) => patchDraft({ propertyTypes })}
                  triggerClassName={selectTriggerClass}
                  menuZIndexClass="z-[400]"
                />
              </FilterField>

              <FilterField label="Bhawan type" htmlFor="dlg-filter-bhawan">
                <EnumMultiSelectDropdown
                  id="dlg-filter-bhawan"
                  emptyLabel="All bhawan types"
                  options={(
                    [
                      "bhawan",
                      "bhawan_under_construction",
                      "shed",
                      "self_made_shed",
                      "building",
                      "no_bhavan_no_plot",
                      "vacant_plot",
                      "na",
                    ] as const
                  ).map((key) => ({
                    value: key,
                    label: bhawanLabel(key),
                  }))}
                  values={draftFilters.bhawanTypes}
                  onChange={(bhawanTypes) => patchDraft({ bhawanTypes })}
                  triggerClassName={selectTriggerClass}
                  menuZIndexClass="z-[400]"
                />
              </FilterField>

              <FilterField label="Verification" htmlFor="dlg-filter-ver">
                <EnumMultiSelectDropdown
                  id="dlg-filter-ver"
                  emptyLabel="All"
                  options={[
                    { value: "pending", label: "Pending" },
                    { value: "verified", label: "Verified" },
                  ]}
                  values={draftFilters.verificationStatuses}
                  onChange={(verificationStatuses) =>
                    patchDraft({ verificationStatuses })
                  }
                  triggerClassName={selectTriggerClass}
                  menuZIndexClass="z-[400]"
                />
              </FilterField>

              <FilterField label="Construction" htmlFor="dlg-filter-const">
                <EnumMultiSelectDropdown
                  id="dlg-filter-const"
                  emptyLabel="All"
                  options={[
                    {
                      value: "not_constructed",
                      label: constructionLabel("not_constructed"),
                    },
                    {
                      value: "under_construction",
                      label: constructionLabel("under_construction"),
                    },
                    { value: "building", label: constructionLabel("building") },
                    {
                      value: "constructed",
                      label: constructionLabel("constructed"),
                    },
                  ]}
                  values={draftFilters.constructionStatuses}
                  onChange={(constructionStatuses) =>
                    patchDraft({ constructionStatuses })
                  }
                  triggerClassName={selectTriggerClass}
                  menuZIndexClass="z-[400]"
                />
              </FilterField>

              <FilterField label="Registration" htmlFor="dlg-filter-reg">
                <EnumMultiSelectDropdown
                  id="dlg-filter-reg"
                  emptyLabel="All"
                  options={[
                    {
                      value: "registered",
                      label: registrationLabel("registered"),
                    },
                    {
                      value: "to_be_registered",
                      label: registrationLabel("to_be_registered"),
                    },
                  ]}
                  values={draftFilters.registrationTypes}
                  onChange={(registrationTypes) =>
                    patchDraft({ registrationTypes })
                  }
                  triggerClassName={selectTriggerClass}
                  menuZIndexClass="z-[400]"
                />
              </FilterField>

              <FilterField label="Record status" htmlFor="dlg-filter-status">
                <EnumMultiSelectDropdown
                  id="dlg-filter-status"
                  emptyLabel="All statuses"
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                  values={draftFilters.statuses}
                  onChange={(statuses) => patchDraft({ statuses })}
                  triggerClassName={selectTriggerClass}
                  menuZIndexClass="z-[400]"
                />
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
