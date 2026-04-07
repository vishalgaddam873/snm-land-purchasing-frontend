import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ApiOfflineNotice } from "@/components/layout/api-offline-notice";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { PropertiesClient } from "@/components/tables/properties-client";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "All Properties",
};

export default async function PropertiesPage() {
  const session = await getServerSessionUser();
  if (!session.ok) {
    return (
      <ApiOfflineNotice
        title="API unreachable"
        error={session.error}
        hint={session.hint}
      />
    );
  }

  const me = session.user;
  if (!me) redirect("/login");

  const canManage = me?.role === "superadmin";

  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { label: "Properties" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="All Properties"
        description={
          canManage
            ? "Record bhawan and land parcels: area, location, registration and verification status."
            : "View property records. Contact a superadmin to add or change entries."
        }
        crumbs={crumbs}
        actionsBesideTitle={canManage}
        actions={
          canManage ? (
            <Link
              href="/properties/new"
              className={cn(
                buttonVariants({ className: "rounded-xl shadow-sm" }),
              )}
            >
              <Plus className="mr-2 size-4" />
              Add property
            </Link>
          ) : null
        }
      />
      <PropertiesClient canManage={canManage} />
    </div>
  );
}
