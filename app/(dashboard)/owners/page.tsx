import { PageHeader } from "@/components/layout/page-header";
import { OwnersPaginatedTable } from "@/components/tables/owners-paginated-table";
import { Button } from "@/components/ui/button";
import { owners } from "@/lib/data/dummy-data";
import { Plus } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Owners",
};

export default function OwnersPage() {
  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { label: "Owners" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Owners"
        description="Land owners linked to acquisition files. Replace with API-backed data when integrated."
        crumbs={crumbs}
        actions={
          <Button type="button" size="sm" className="rounded-xl shadow-sm">
            <Plus className="size-4" />
            Add owner
          </Button>
        }
      />

      <OwnersPaginatedTable data={owners} />
    </div>
  );
}
