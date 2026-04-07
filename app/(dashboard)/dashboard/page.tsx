import { DashboardPropertyAnalytics } from "@/components/dashboard/dashboard-property-analytics";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LineChart } from "lucide-react";
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Live property analytics: filter by overall register, department, zone, or branch, then explore KPIs, charts, and detailed A/B breakdowns."
        crumbs={crumbs}
        actions={
          <Link
            href="/reports"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-2 rounded-xl",
            )}
          >
            <LineChart className="size-4" />
            Reports
          </Link>
        }
      />

      <DashboardPropertyAnalytics />
    </div>
  );
}
