import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApiOfflineNotice } from "@/components/layout/api-offline-notice";
import { PageHeader } from "@/components/layout/page-header";
import { BranchesClient } from "@/components/tables/branches-client";
import { getServerSessionUser } from "@/lib/auth/server-session";

export const metadata: Metadata = {
  title: "Branches",
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

  const canManage = me?.role === "superadmin";

  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { label: "Branches" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Branches"
        description={
          canManage
            ? "Create branches and assign each to a zone. Other users can view and filter the list."
            : "Branches by zone. Contact a superadmin to add or change branches."
        }
        crumbs={crumbs}
      />
      <BranchesClient canManage={canManage} />
    </div>
  );
}
