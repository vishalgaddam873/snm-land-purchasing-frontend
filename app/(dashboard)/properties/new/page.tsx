import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PropertyFormPageClient } from "@/components/properties/property-form-page-client";
import { ApiOfflineNotice } from "@/components/layout/api-offline-notice";
import { PageHeader } from "@/components/layout/page-header";
import { getServerSessionUser } from "@/lib/auth/server-session";

export const metadata: Metadata = {
  title: "Add property",
};

export default async function PropertyNewPage() {
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
  if (!session.user) redirect("/login");
  if (session.user.role !== "superadmin") {
    redirect("/properties");
  }

  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { href: "/properties", label: "Properties" },
    { label: "Add property" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Add property"
        description="Create a register entry with branch, location, and structure details—the same form as edit."
        crumbs={crumbs}
      />
      <PropertyFormPageClient mode="create" />
    </div>
  );
}
