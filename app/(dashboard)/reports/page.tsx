import { PageHeader } from "@/components/layout/page-header";
import { ReportsPageClient } from "@/components/reports/reports-page-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports",
};

export default function ReportsPage() {
  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { label: "Reports" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports"
        description="Zone-wise summary reports. Select a department or zone to view the summary, then print or save as PDF."
        crumbs={crumbs}
      />

      <ReportsPageClient />
    </div>
  );
}
