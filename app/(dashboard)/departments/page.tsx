import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApiOfflineNotice } from "@/components/layout/api-offline-notice";
import { DepartmentsClient } from "@/components/tables/departments-client";
import { getServerSessionUser } from "@/lib/auth/server-session";

export const metadata: Metadata = {
  title: "All Departments",
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
    <DepartmentsClient
      title="All Departments"
      description="Manage publicity departments used for zone and branch mapping. Codes are generated automatically (DEP-001, DEP-002…)."
      crumbs={crumbs}
    />
  );
}
