"use client";

import { Input } from "@/components/ui/input";
import {
  branchOptionId,
  type BranchOption,
} from "@/components/properties/property-helpers";
import { cn } from "@/lib/utils";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { CheckIcon, ChevronDownIcon, Search } from "lucide-react";
import * as React from "react";

const menuItemClass = cn(
  "relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none",
  "focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground",
);

type BranchSearchableSelectProps = {
  id?: string;
  branches: BranchOption[];
  disabled?: boolean;
  /** Selected branch id, or "" when none / “all”. */
  value: string;
  onChange: (branchId: string) => void;
  /** Shown on the closed trigger (e.g. branch name or “All branches”). */
  triggerLabel: string;
  /** When true, first row is “all” and calls onChange(""). */
  showAllOption?: boolean;
  allOptionLabel?: string;
  triggerClassName?: string;
  /** z-index for the menu (use higher inside dialogs). */
  menuZIndexClass?: string;
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function BranchSearchableSelect({
  id,
  branches,
  disabled,
  value,
  onChange,
  triggerLabel,
  showAllOption = false,
  allOptionLabel = "All branches",
  triggerClassName,
  menuZIndexClass = "z-[300]",
}: BranchSearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = norm(query);
    if (!q) return branches;
    return branches.filter((b) => norm(b.name).includes(q));
  }, [branches, query]);

  function commit(nextId: string) {
    onChange(nextId);
    setOpen(false);
  }

  return (
    <MenuPrimitive.Root open={open} onOpenChange={setOpen}>
      <MenuPrimitive.Trigger
        id={id}
        disabled={disabled}
        type="button"
        data-slot="branch-search-trigger"
        className={cn(
          "flex h-10 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl border border-border/80 bg-background px-3 text-left text-[13px] shadow-sm outline-none",
          "transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          triggerClassName,
        )}
      >
        <span className="line-clamp-1 flex-1">{triggerLabel}</span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground opacity-80" />
      </MenuPrimitive.Trigger>

      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner
          align="start"
          alignOffset={0}
          side="bottom"
          sideOffset={4}
          className={cn("isolate outline-none", menuZIndexClass)}
        >
          <MenuPrimitive.Popup
            data-slot="branch-search-popup"
            className={cn(
              "flex max-h-72 min-w-(--anchor-width) w-(--anchor-width) max-w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl bg-popover py-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100",
              "origin-(--transform-origin) data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2",
            )}
          >
            <div
              className="shrink-0 border-b border-border/60 bg-popover px-2 pb-2 pt-1.5"
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by branch name…"
                  className="h-9 rounded-lg border-border/80 bg-background pl-9 text-sm shadow-sm"
                  autoComplete="off"
                  disabled={disabled}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div className="max-h-52 min-h-0 overflow-y-auto p-1">
              {showAllOption ? (
                <MenuPrimitive.Item
                  className={menuItemClass}
                  onClick={() => commit("")}
                >
                  <span className="line-clamp-1 flex-1">{allOptionLabel}</span>
                  {value === "" ? (
                    <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                      <CheckIcon className="size-4" />
                    </span>
                  ) : null}
                </MenuPrimitive.Item>
              ) : null}
              {filtered.length === 0 ? (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                  {branches.length === 0
                    ? "No branches available."
                    : query.trim()
                      ? `No branches match “${query.trim()}”.`
                      : "No branches match."}
                </p>
              ) : (
                filtered.map((b) => {
                  const bid = branchOptionId(b);
                  if (!bid) return null;
                  const selected = value === bid;
                  return (
                    <MenuPrimitive.Item
                      key={bid}
                      className={menuItemClass}
                      onClick={() => commit(bid)}
                    >
                      <span className="line-clamp-1 flex-1">{b.name}</span>
                      {selected ? (
                        <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                          <CheckIcon className="size-4" />
                        </span>
                      ) : null}
                    </MenuPrimitive.Item>
                  );
                })
              )}
            </div>
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
