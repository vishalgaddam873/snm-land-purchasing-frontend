"use client";

import { PropertyEditForm } from "@/components/properties/property-edit-form";
import {
  fetchBranchesForSelect,
  type BranchOption,
  type PropertyRow,
} from "@/components/properties/property-helpers";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

type PropertyFormPageClientProps =
  | { mode: "create" }
  | { mode: "edit"; property: PropertyRow };

export function PropertyFormPageClient(props: PropertyFormPageClientProps) {
  const router = useRouter();
  const [branches, setBranches] = React.useState<BranchOption[]>([]);

  React.useEffect(() => {
    void fetchBranchesForSelect().then(setBranches);
  }, []);

  const isEdit = props.mode === "edit";
  const property = isEdit ? props.property : undefined;

  return (
    <div className="w-full space-y-6">
      <Link
        href="/properties"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "rounded-xl",
        )}
      >
        ← Back to list
      </Link>
      <div className="w-full rounded-2xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <PropertyEditForm
          mode={props.mode}
          property={property}
          branches={branches}
          showInternalNotes
          showStatusVerification={isEdit}
          onSuccess={(payload) => {
            if (isEdit && property) {
              router.push(`/properties/${property._id}`);
              return;
            }
            if (payload?._id) {
              router.push(`/properties/${payload._id}`);
              return;
            }
            router.push("/properties");
          }}
          onCancel={() => router.push("/properties")}
          className="w-full max-w-none space-y-5"
        />
      </div>
    </div>
  );
}
