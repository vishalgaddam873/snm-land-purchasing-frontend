import { ApprovalsQueue } from "@/components/tables/approvals-queue";
import { PageHeader } from "@/components/layout/page-header";
import { approvals } from "@/lib/data/dummy-data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Approvals",
};

export default function ApprovalsPage() {
  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { label: "Approvals" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Approvals"
        description="Review open requests with calm, deliberate actions. Status changes here are local-only for the demo."
        crumbs={crumbs}
      />

      <ApprovalsQueue items={approvals} />
    </div>
  );
}
