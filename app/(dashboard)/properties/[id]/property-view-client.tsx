"use client";

import { PropertyViewBody } from "@/components/properties/property-view-body";
import type { PropertyRow } from "@/components/properties/property-helpers";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";

export function PropertyViewClient({
  property,
  canManage,
}: {
  property: PropertyRow;
  canManage: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/properties"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "rounded-xl",
          )}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to list
        </Link>
        {canManage ? (
          <Link
            href={`/properties/${property._id}/edit`}
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "rounded-xl shadow-sm",
            )}
          >
            <Pencil className="mr-2 size-4" />
            Edit
          </Link>
        ) : null}
      </div>
      <PropertyViewBody
        property={property}
        showInternalNotes={canManage}
      />
    </div>
  );
}
