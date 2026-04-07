"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ApprovalItem, LandStatus } from "@/lib/data/types";
import * as React from "react";

export function ApprovalsQueue({ items }: { items: ApprovalItem[] }) {
  const [rows, setRows] = React.useState(items);

  function setStatus(id: string, status: LandStatus) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map((item) => (
        <Card
          key={item.id}
          className="rounded-2xl border-border/80 shadow-sm transition-shadow hover:shadow-md"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base leading-snug">
                {item.title}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {item.landId} · Submitted {item.submittedAt} ·{" "}
                {item.submittedBy}
              </p>
            </div>
            <StatusBadge status={item.status} />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Review supporting documents and field notes before confirming.
            </p>
          </CardContent>
          {item.status === "pending" ? (
            <CardFooter className="flex flex-wrap gap-2 border-t border-border/60 bg-muted/20">
              <Button
                type="button"
                size="sm"
                className="rounded-xl"
                onClick={() => setStatus(item.id, "approved")}
              >
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => setStatus(item.id, "rejected")}
              >
                Reject
              </Button>
            </CardFooter>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
