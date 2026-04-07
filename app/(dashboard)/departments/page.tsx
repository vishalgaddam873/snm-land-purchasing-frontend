import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApiOfflineNotice } from "@/components/layout/api-offline-notice";
import { PageHeader } from "@/components/layout/page-header";
import { DepartmentsClient } from "@/components/tables/departments-client";
import { getServerSessionUser } from "@/lib/auth/server-session";

export const metadata: Metadata = {
  title: "Departments",
};

export default async function DepartmentsPage() {
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
  if (me?.role !== "superadmin") redirect("/dashboard");

  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { label: "Departments" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Departments"
        description="Manage publicity departments used for zone/branch mapping and reporting."
        crumbs={crumbs}
      />
      <DepartmentsClient />
    </div>
  );
}

