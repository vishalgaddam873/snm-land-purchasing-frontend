import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApiOfflineNotice } from "@/components/layout/api-offline-notice";
import { SectorsClient } from "@/components/tables/sectors-client";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { moduleAllowsEdit } from "@/lib/auth/module-access";

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

  const canManage = moduleAllowsEdit(me, "sectors");

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
          ? "Define sectors within zones. Branches can optionally be linked to a sector. Superadmins can seed or update sectors in bulk from Excel (sample download next to search)."
          : "Sectors within zones. You have read-only access for this module."
      }
      crumbs={crumbs}
    />
  );
}
