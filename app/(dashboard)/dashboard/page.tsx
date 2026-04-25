import { DashboardPropertyAnalytics } from "@/components/dashboard/dashboard-property-analytics";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LineChart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { moduleAllowsEdit, moduleAllowsView } from "@/lib/auth/module-access";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await getServerSessionUser();
  if (!session.ok) {
    redirect("/login");
  }
  if (!session.user) redirect("/login");
  if (!moduleAllowsView(session.user, "dashboard")) {
    redirect("/properties");
  }
  const canEditDashboard = moduleAllowsEdit(session.user, "dashboard");
  const canEditReports = moduleAllowsEdit(session.user, "reports");

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
          canEditDashboard && canEditReports ? (
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
          ) : null
        }
      />

      <DashboardPropertyAnalytics />
    </div>
  );
}
