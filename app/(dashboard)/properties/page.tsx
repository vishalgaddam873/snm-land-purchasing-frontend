import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApiOfflineNotice } from "@/components/layout/api-offline-notice";
import { PageHeader } from "@/components/layout/page-header";
import { PropertiesClient } from "@/components/tables/properties-client";
import { getServerSessionUser } from "@/lib/auth/server-session";

export const metadata: Metadata = {
  title: "Properties",
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
        title="Properties"
        description={
          canManage
            ? "Record bhawan and land parcels: area, location, registration and verification status."
            : "View property records. Contact a superadmin to add or change entries."
        }
        crumbs={crumbs}
      />
      <PropertiesClient canManage={canManage} />
    </div>
  );
}
