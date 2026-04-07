import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { label: "Settings" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Department preferences and display options. Values are illustrative only."
        crumbs={crumbs}
      />

      <Card className="rounded-2xl border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Department profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dept">Department name</Label>
              <Input
                id="dept"
                defaultValue="Land and Building Maintenance"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Public contact</Label>
              <Input
                id="contact"
                placeholder="coordinator@mission.org"
                className="h-10 rounded-xl"
              />
            </div>
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button type="button" className="rounded-xl shadow-sm">
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
