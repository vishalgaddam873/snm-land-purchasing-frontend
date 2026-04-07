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
import { BranchSearchableSelect } from "@/components/properties/branch-searchable-select";
import {
  bhawanLabel,
  branchOptionId,
  constructionLabel,
  labelFromSnake,
  PROPERTY_ENUM_FILTER_ALL,
  propertyTypeLabel,
  registrationLabel,
  sortBranchesForSelect,
  type BranchOption,
} from "@/components/properties/property-helpers";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal } from "lucide-react";
import * as React from "react";

export type PropertyListFilterValues = {
  branchId: string;
  propertyType: string;
  status: string;
  verificationStatus: string;
  registrationType: string;
  constructionStatus: string;
  bhawanType: string;
};

export const EMPTY_PROPERTY_LIST_FILTERS: PropertyListFilterValues = {
  branchId: "",
  propertyType: "",
  status: "",
  verificationStatus: "",
  registrationType: "",
  constructionStatus: "",
  bhawanType: "",
};

export function countActivePropertyFilters(
  f: PropertyListFilterValues,
): number {
  return (
    (f.branchId ? 1 : 0) +
    (f.propertyType ? 1 : 0) +
    (f.status ? 1 : 0) +
    (f.verificationStatus ? 1 : 0) +
    (f.registrationType ? 1 : 0) +
    (f.constructionStatus ? 1 : 0) +
    (f.bhawanType ? 1 : 0)
  );
}

type PropertiesFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  /** Committed filters sent to the API. */
  appliedFilters: PropertyListFilterValues;
  /** Called when the user saves filters from the dialog. */
  onApplyFilters: (next: PropertyListFilterValues) => void;
  onClearAll: () => void;
  branches: BranchOption[];
  branchesLoading: boolean;
  branchesFetchError: string | null;
  className?: string;
};

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

export function PropertiesFilterBar({
  search,
  onSearchChange,
  appliedFilters,
  onApplyFilters,
  onClearAll,
  branches,
  branchesLoading,
  branchesFetchError,
  className,
}: PropertiesFilterBarProps) {
  const [filterDialogOpen, setFilterDialogOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] =
    React.useState<PropertyListFilterValues>(appliedFilters);

  const sortedBranches = React.useMemo(
    () => sortBranchesForSelect(branches),
    [branches],
  );

  /** Base UI SelectValue shows raw `value` unless we pass explicit children. */
  const branchTriggerLabel = React.useMemo(() => {
    if (!draftFilters.branchId) return "All branches";
    if (branchesLoading) return "Loading…";
    const b = sortedBranches.find(
      (x) => branchOptionId(x) === draftFilters.branchId,
    );
    return b?.name ?? "Unknown branch";
  }, [
    draftFilters.branchId,
    sortedBranches,
    branchesLoading,
  ]);

  const propertyTypeTriggerLabel = React.useMemo(
    () =>
      draftFilters.propertyType
        ? propertyTypeLabel(draftFilters.propertyType)
        : "All types",
    [draftFilters.propertyType],
  );

  const statusTriggerLabel = React.useMemo(
    () =>
      draftFilters.status
        ? labelFromSnake(draftFilters.status)
        : "All statuses",
    [draftFilters.status],
  );

  const verificationTriggerLabel = React.useMemo(
    () =>
      draftFilters.verificationStatus
        ? labelFromSnake(draftFilters.verificationStatus)
        : "All",
    [draftFilters.verificationStatus],
  );

  const constructionTriggerLabel = React.useMemo(
    () =>
      draftFilters.constructionStatus
        ? constructionLabel(draftFilters.constructionStatus)
        : "All",
    [draftFilters.constructionStatus],
  );

  const registrationTriggerLabel = React.useMemo(
    () =>
      draftFilters.registrationType
        ? registrationLabel(draftFilters.registrationType)
        : "All",
    [draftFilters.registrationType],
  );

  const bhawanTriggerLabel = React.useMemo(
    () =>
      draftFilters.bhawanType
        ? bhawanLabel(draftFilters.bhawanType)
        : "All",
    [draftFilters.bhawanType],
  );

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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Search updates as you type. Use the filter control to narrow by branch,
          type, status, and more — then <span className="font-medium text-foreground/90">Save filters</span> to
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

      {branchesFetchError ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {branchesFetchError}
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
          className="flex max-h-[min(85vh,40rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-xl"
          showCloseButton
        >
          <DialogHeader className="space-y-1 border-b border-border/60 px-5 py-4 text-left">
            <DialogTitle className="text-base font-semibold">
              Filters
            </DialogTitle>
            <DialogDescription className="text-sm">
              Adjust fields below, then save to update the table. Closing without
              saving keeps your current list.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <Select
                  value={
                    draftFilters.propertyType || PROPERTY_ENUM_FILTER_ALL
                  }
                  onValueChange={(v) =>
                    patchDraft({
                      propertyType:
                        v === PROPERTY_ENUM_FILTER_ALL ? "" : (v ?? ""),
                    })
                  }
                >
                  <SelectTrigger
                    id="dlg-filter-ptype"
                    className={selectTriggerClass}
                  >
                    <SelectValue placeholder="All types">
                      {propertyTypeTriggerLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PROPERTY_ENUM_FILTER_ALL}>
                      All types
                    </SelectItem>
                    <SelectItem value="main_branch">
                      {propertyTypeLabel("main_branch")}
                    </SelectItem>
                    <SelectItem value="additional_unit">
                      {propertyTypeLabel("additional_unit")}
                    </SelectItem>
                    <SelectItem value="adjoining_plot">
                      {propertyTypeLabel("adjoining_plot")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Record status" htmlFor="dlg-filter-status">
                <Select
                  value={draftFilters.status || PROPERTY_ENUM_FILTER_ALL}
                  onValueChange={(v) =>
                    patchDraft({
                      status:
                        v === PROPERTY_ENUM_FILTER_ALL ? "" : (v ?? ""),
                    })
                  }
                >
                  <SelectTrigger
                    id="dlg-filter-status"
                    className={selectTriggerClass}
                  >
                    <SelectValue placeholder="All statuses">
                      {statusTriggerLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PROPERTY_ENUM_FILTER_ALL}>
                      All statuses
                    </SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Verification" htmlFor="dlg-filter-ver">
                <Select
                  value={
                    draftFilters.verificationStatus || PROPERTY_ENUM_FILTER_ALL
                  }
                  onValueChange={(v) =>
                    patchDraft({
                      verificationStatus:
                        v === PROPERTY_ENUM_FILTER_ALL ? "" : (v ?? ""),
                    })
                  }
                >
                  <SelectTrigger
                    id="dlg-filter-ver"
                    className={selectTriggerClass}
                  >
                    <SelectValue placeholder="All">
                      {verificationTriggerLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PROPERTY_ENUM_FILTER_ALL}>All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Construction" htmlFor="dlg-filter-const">
                <Select
                  value={
                    draftFilters.constructionStatus || PROPERTY_ENUM_FILTER_ALL
                  }
                  onValueChange={(v) =>
                    patchDraft({
                      constructionStatus:
                        v === PROPERTY_ENUM_FILTER_ALL ? "" : (v ?? ""),
                    })
                  }
                >
                  <SelectTrigger
                    id="dlg-filter-const"
                    className={selectTriggerClass}
                  >
                    <SelectValue placeholder="All">
                      {constructionTriggerLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PROPERTY_ENUM_FILTER_ALL}>All</SelectItem>
                    <SelectItem value="not_constructed">
                      {constructionLabel("not_constructed")}
                    </SelectItem>
                    <SelectItem value="under_construction">
                      {constructionLabel("under_construction")}
                    </SelectItem>
                    <SelectItem value="constructed">
                      {constructionLabel("constructed")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Registration" htmlFor="dlg-filter-reg">
                <Select
                  value={
                    draftFilters.registrationType || PROPERTY_ENUM_FILTER_ALL
                  }
                  onValueChange={(v) =>
                    patchDraft({
                      registrationType:
                        v === PROPERTY_ENUM_FILTER_ALL ? "" : (v ?? ""),
                    })
                  }
                >
                  <SelectTrigger
                    id="dlg-filter-reg"
                    className={selectTriggerClass}
                  >
                    <SelectValue placeholder="All">
                      {registrationTriggerLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PROPERTY_ENUM_FILTER_ALL}>All</SelectItem>
                    <SelectItem value="registered">
                      {registrationLabel("registered")}
                    </SelectItem>
                    <SelectItem value="to_be_registered">
                      {registrationLabel("to_be_registered")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>

              <div className="sm:col-span-2">
                <FilterField label="Bhawan type" htmlFor="dlg-filter-bhawan">
                  <Select
                    value={draftFilters.bhawanType || PROPERTY_ENUM_FILTER_ALL}
                    onValueChange={(v) =>
                      patchDraft({
                        bhawanType:
                          v === PROPERTY_ENUM_FILTER_ALL ? "" : (v ?? ""),
                      })
                    }
                  >
                    <SelectTrigger
                      id="dlg-filter-bhawan"
                      className={selectTriggerClass}
                    >
                      <SelectValue placeholder="All">
                        {bhawanTriggerLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value={PROPERTY_ENUM_FILTER_ALL}>
                        All
                      </SelectItem>
                      {(
                        [
                          "bhawan",
                          "shed",
                          "self_made_shed",
                          "building",
                          "no_bhavan_no_plot",
                          "vacant_plot",
                          "na",
                        ] as const
                      ).map((key) => (
                        <SelectItem key={key} value={key}>
                          {bhawanLabel(key)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>
              </div>
            </div>
          </div>

          <DialogFooter className="-mx-0 -mb-0 mt-0 flex-col gap-2 rounded-none rounded-b-2xl border-t border-border/60 bg-muted/20 px-5 py-4 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl sm:w-auto"
              onClick={resetDraft}
            >
              Reset form
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
