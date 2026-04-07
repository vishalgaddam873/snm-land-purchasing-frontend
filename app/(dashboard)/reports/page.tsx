import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardStats } from "@/lib/data/dummy-data";
import { formatCompactInr } from "@/lib/format";
import { Download } from "lucide-react";
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
        description="Export-friendly summaries for leadership reviews. Connect reporting services when your data layer is ready."
        crumbs={crumbs}
        actions={
          <Button type="button" variant="outline" size="sm" className="rounded-xl">
            <Download className="size-4" />
            Download PDF
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Acquisition snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex justify-between gap-4">
              <span>Total lands</span>
              <span className="font-semibold text-foreground">
                {dashboardStats.totalLands}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Approved</span>
              <span className="font-semibold text-foreground">
                {dashboardStats.approvedLands}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Pending</span>
              <span className="font-semibold text-foreground">
                {dashboardStats.pendingApprovals}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Investment (reported)</span>
              <span className="font-semibold text-foreground">
                {formatCompactInr(dashboardStats.totalInvestmentInr)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Next steps</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-inside list-disc space-y-2">
              <li>Wire MongoDB / API aggregates for live numbers</li>
              <li>Add date-range filters and zone breakdown</li>
              <li>Schedule gentle email digests to reviewers</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
