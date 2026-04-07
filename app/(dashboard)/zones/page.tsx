import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApiOfflineNotice } from "@/components/layout/api-offline-notice";
import { ZonesClient } from "@/components/tables/zones-client";
import { getServerSessionUser } from "@/lib/auth/server-session";

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

  const canManage = me?.role === "superadmin";

  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { label: "Zones" },
  ];

  return (
    <ZonesClient
      canManage={canManage}
      title="All Zones"
      description={
        canManage
          ? "Define zones under publicity departments. Zone numbers are set manually (e.g. 1, 1A)."
          : "Zones under publicity departments. Contact a superadmin to add or change zones."
      }
      crumbs={crumbs}
    />
  );
}
