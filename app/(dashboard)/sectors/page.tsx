import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApiOfflineNotice } from "@/components/layout/api-offline-notice";
import { SectorsClient } from "@/components/tables/sectors-client";
import { getServerSessionUser } from "@/lib/auth/server-session";

export const metadata: Metadata = {
  title: "Sectors",
};

export default async function SectorsPage() {
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
    { label: "Sectors" },
  ];

  return (
    <SectorsClient
      canManage={canManage}
      title="Sectors"
      description={
        canManage
          ? "Define sectors within zones. Branches can optionally be linked to a sector."
          : "Sectors within zones. Contact a superadmin to add or change sectors."
      }
      crumbs={crumbs}
    />
  );
}
