import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApiOfflineNotice } from "@/components/layout/api-offline-notice";
import { UsersAdminClient } from "@/components/tables/users-admin-client";
import { getServerSessionUser } from "@/lib/auth/server-session";

export const metadata: Metadata = {
  title: "User management",
};

export default async function AdminUsersPage() {
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
    { label: "User management" },
  ];

  return (
    <UsersAdminClient
      title="User management"
      description="Create coordinators and reviewers with appropriate roles. Superadmin only."
      crumbs={crumbs}
    />
  );
}
