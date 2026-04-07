import { AddLandForm } from "@/components/forms/add-land-form";
import { PageHeader } from "@/components/layout/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add land",
};

export default function AddLandPage() {
  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { href: "/land", label: "Land Records" },
    { label: "Add Land" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Add land record"
        description="A guided flow to capture land basics, owner details, documents, and a final review before routing to approvals."
        crumbs={crumbs}
      />

      <AddLandForm />
    </div>
  );
}
