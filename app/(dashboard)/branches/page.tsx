import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApiOfflineNotice } from "@/components/layout/api-offline-notice";
import { BranchesClient } from "@/components/tables/branches-client";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { moduleAllowsEdit } from "@/lib/auth/module-access";

export const metadata: Metadata = {
  title: "All Branches",
};

export default async function BranchesPage() {
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

  const canManage = moduleAllowsEdit(me, "branches");
  const canExportExcel =
    canManage && String(me.role ?? "").toLowerCase() !== "moderator";

  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { label: "Branches" },
  ];

  return (
    <BranchesClient
      canManage={canManage}
      canExportExcel={canExportExcel}
      title="All Branches"
      description={
        canManage
          ? "Create branches and assign each to a zone. Other users can view and filter the list."
          : "Branches by zone. You have read-only access for this module."
      }
      crumbs={crumbs}
    />
  );
}
