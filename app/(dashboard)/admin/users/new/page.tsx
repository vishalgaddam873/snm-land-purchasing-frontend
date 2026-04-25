import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApiOfflineNotice } from "@/components/layout/api-offline-notice";
import { PageHeader } from "@/components/layout/page-header";
import { UserFormPageClient } from "@/components/users/user-form-page-client";
import { getServerSessionUser } from "@/lib/auth/server-session";

export const metadata: Metadata = {
  title: "Add user",
};

export default async function AdminUserNewPage() {
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
    { href: "/admin/users", label: "User management" },
    { label: "Add user" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Add user"
        description="Create a new user, set role, department scope, and module permissions."
        crumbs={crumbs}
      />
      <UserFormPageClient mode="create" />
    </div>
  );
}

