import { PageHeader } from "@/components/layout/page-header";
import { LandRecordsTable } from "@/components/tables/land-records-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { landRecords } from "@/lib/data/dummy-data";
import { cn } from "@/lib/utils";
import { FileDown, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Land records",
};

export default function LandRecordsPage() {
  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { label: "Land Records" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Land records"
        description="Search, filter, and review acquisition entries. Data shown is sample content for UI development."
        crumbs={crumbs}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
            >
              <FileDown className="size-4" />
              Export
            </Button>
            <Link
              href="/land/add"
              className={cn(buttonVariants({ size: "sm" }), "rounded-xl shadow-sm")}
            >
              <Plus className="size-4" />
              Add land
            </Link>
          </>
        }
      />

      <LandRecordsTable data={landRecords} />
    </div>
  );
}
