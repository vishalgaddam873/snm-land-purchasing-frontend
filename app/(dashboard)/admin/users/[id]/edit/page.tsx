import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ApiOfflineNotice } from "@/components/layout/api-offline-notice";
import { PageHeader } from "@/components/layout/page-header";
import type { AdminUserEditable } from "@/components/users/user-form-page-client";
import { UserFormPageClient } from "@/components/users/user-form-page-client";
import { backendFetch } from "@/lib/api/backend";
import { getServerSessionUser } from "@/lib/auth/server-session";

export const metadata: Metadata = {
  title: "Edit user",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminUserEditPage({ params }: PageProps) {
  const { id } = await params;

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

  const res = await backendFetch(`/users/${id}`);
  if (res.status === 404) notFound();
  if (!res.ok) {
    return (
      <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Could not load this user for editing.
      </div>
    );
  }

  const user = (await res.json()) as AdminUserEditable;

  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { href: "/admin/users", label: "User management" },
    { label: user.username || user.email || "User" },
    { label: "Edit" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Edit user"
        description="Update role, status, department scope, and module permissions."
        crumbs={crumbs}
      />
      <UserFormPageClient mode="edit" user={user} />
    </div>
  );
}

