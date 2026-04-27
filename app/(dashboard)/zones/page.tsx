import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApiOfflineNotice } from "@/components/layout/api-offline-notice";
import { ZonesClient } from "@/components/tables/zones-client";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { moduleAllowsEdit } from "@/lib/auth/module-access";

export const metadata: Metadata = {
  title: "All Zones",
};

export default async function ZonesPage() {
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

  const canManage = moduleAllowsEdit(me, "zones");
  const canExportExcel =
    canManage && String(me.role ?? "").toLowerCase() !== "moderator";

  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { label: "Zones" },
  ];

  return (
    <ZonesClient
      canManage={canManage}
      canExportExcel={canExportExcel}
      title="All Zones"
      description={
        canManage
          ? "Define zones under publicity departments. Zone numbers are set manually (e.g. 1, 1A). Superadmins can seed or update zones in bulk from Excel (sample download next to search)."
          : "Zones under publicity departments. You have read-only access for this module."
      }
      crumbs={crumbs}
    />
  );
}
