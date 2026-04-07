"use client";

import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

/** Server pages must not pass `onClick` into Client Components; use this for dummy row actions. */
export function PlaceholderEditDeleteRowActions({
  editAriaLabel,
  deleteAriaLabel,
}: {
  editAriaLabel: string;
  deleteAriaLabel: string;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        className="rounded-xl active:!translate-y-0"
        aria-label={editAriaLabel}
        onClick={() => undefined}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        className="rounded-xl active:!translate-y-0"
        aria-label={deleteAriaLabel}
        onClick={() => undefined}
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </div>
  );
}
