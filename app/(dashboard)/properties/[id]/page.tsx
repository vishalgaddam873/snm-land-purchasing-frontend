import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PropertyViewClient } from "./property-view-client";
import { ApiOfflineNotice } from "@/components/layout/api-offline-notice";
import { PageHeader } from "@/components/layout/page-header";
import type { PropertyRow } from "@/components/properties/property-helpers";
import { backendFetch } from "@/lib/api/backend";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { moduleAllowsEdit } from "@/lib/auth/module-access";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Property details",
    description: `Property record ${id}`,
  };
}

export default async function PropertyDetailPage({ params }: PageProps) {
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

  const res = await backendFetch(`/properties/${id}`);
  if (res.status === 404) {
    notFound();
  }
  if (!res.ok) {
    return (
      <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Could not load this property.
      </div>
    );
  }

  const property = (await res.json()) as PropertyRow;
  const canManage = moduleAllowsEdit(session.user, "properties");

  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { href: "/properties", label: "Properties" },
    { label: property.propertyName || "Details" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={property.propertyName || "Property"}
        description="Full record: zone, branch, area, location, remarks, and verification."
        crumbs={crumbs}
      />
      <PropertyViewClient property={property} canManage={canManage} />
    </div>
  );
}
