import { PageHeader } from "@/components/layout/page-header";
import { RecentActivityPaginatedTable } from "@/components/tables/recent-activity-paginated-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardStats, recentActivity } from "@/lib/data/dummy-data";
import { formatCompactInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FileDown, Landmark, LineChart, Timer, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { label: "Dashboard" },
  ];

  const stats = [
    {
      title: "Total lands",
      value: String(dashboardStats.totalLands),
      hint: "Registered parcels",
      icon: Landmark,
    },
    {
      title: "Approved",
      value: String(dashboardStats.approvedLands),
      hint: "Cleared for records",
      icon: LineChart,
    },
    {
      title: "Pending approvals",
      value: String(dashboardStats.pendingApprovals),
      hint: "Awaiting review",
      icon: Timer,
    },
    {
      title: "Total investment",
      value: formatCompactInr(dashboardStats.totalInvestmentInr),
      hint: "Reported consideration",
      icon: Wallet,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="A calm overview of land records, approvals, and recent activity across the department."
        crumbs={crumbs}
        actions={
          <>
            <Link
              href="/reports"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-xl")}
            >
              <LineChart className="size-4" />
              Reports
            </Link>
            <Link
              href="/land/add"
              className={cn(buttonVariants({ size: "sm" }), "rounded-xl shadow-sm")}
            >
              Add land
            </Link>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card
              key={s.title}
              className="rounded-2xl border-border/80 shadow-sm transition-shadow hover:shadow-md"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.title}
                </CardTitle>
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground">{s.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Recent activity
            </h2>
            <p className="text-sm text-muted-foreground">
              Latest updates from coordinators and reviewers.
            </p>
          </div>
          <Button variant="ghost" size="sm" className="rounded-xl" type="button">
            <FileDown className="size-4" />
            Export log
          </Button>
        </div>

        <Card className="rounded-2xl border-border/80 shadow-sm">
          <CardContent className="p-0">
            <RecentActivityPaginatedTable
              data={recentActivity}
              embedInCard
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
