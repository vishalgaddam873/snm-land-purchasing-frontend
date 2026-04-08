import { PageHeader } from "@/components/layout/page-header";
import { ReportsPageClient } from "@/components/reports/reports-page-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Summary Report",
};

export default function ReportsPage() {
  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { label: "Summary Report" },
  ];

  return (
    <div className="h-[calc(100vh-2rem)] overflow-hidden space-y-6">
      <PageHeader
        title="Summary Report"
        description="Department/Zone wise summary with PDF preview."
        crumbs={crumbs}
      />

      <ReportsPageClient />
    </div>
  );
}
