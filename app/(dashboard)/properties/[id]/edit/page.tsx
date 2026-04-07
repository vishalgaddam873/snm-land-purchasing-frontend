import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PropertyEditPageClient } from "./property-edit-page-client";
import { ApiOfflineNotice } from "@/components/layout/api-offline-notice";
import { PageHeader } from "@/components/layout/page-header";
import type { PropertyRow } from "@/components/properties/property-helpers";
import { backendFetch } from "@/lib/api/backend";
import { getServerSessionUser } from "@/lib/auth/server-session";

export const metadata: Metadata = {
  title: "Edit property",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function PropertyEditPage({ params }: PageProps) {
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
  if (!session.user) redirect("/login");
  if (session.user.role !== "superadmin") {
    redirect(`/properties/${id}`);
  }

  const res = await backendFetch(`/properties/${id}`);
  if (res.status === 404) {
    notFound();
  }
  if (!res.ok) {
    return (
      <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Could not load this property for editing.
      </div>
    );
  }

  const property = (await res.json()) as PropertyRow;

  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { href: "/properties", label: "Properties" },
    { href: `/properties/${id}`, label: property.propertyName || "Details" },
    { label: "Edit" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Edit property"
        description="Update register fields, branch link, and verification status."
        crumbs={crumbs}
      />
      <PropertyEditPageClient property={property} />
    </div>
  );
}
