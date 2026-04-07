import { FileDropzone } from "@/components/forms/file-dropzone";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentsRecentPaginatedTable } from "@/components/tables/documents-recent-paginated-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { documents } from "@/lib/data/dummy-data";
import { FileText } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documents",
};

export default function DocumentsPage() {
  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { label: "Documents" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Documents"
        description="Central place for deeds, maps, and identity proofs. Upload UI is interactive; persistence is not wired yet."
        crumbs={crumbs}
        actions={
          <Button type="button" variant="outline" size="sm" className="rounded-xl">
            <FileText className="size-4" />
            Templates
          </Button>
        }
      />

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <FileDropzone />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Recent files</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <DocumentsRecentPaginatedTable data={documents} embedInCard />
        </CardContent>
      </Card>
    </div>
  );
}
