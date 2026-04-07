"use client";

import { cn } from "@/lib/utils";
import DOMPurify from "isomorphic-dompurify";
import * as React from "react";

const displayClassName = cn(
  "property-remarks-content text-sm text-foreground",
  "[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:first:mt-0",
  "[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold",
  "[&_p]:mb-2 [&_p:last-child]:mb-0",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6",
  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_li]:my-0.5",
  "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
  "[&_a]:text-primary [&_a]:underline",
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs",
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs",
  "[&_hr]:my-4 [&_hr]:border-border",
);

export function PropertyRemarksDisplay({
  remarks,
}: {
  remarks: string | undefined;
}) {
  const raw = remarks?.trim();
  if (!raw) {
    return <p className="text-sm text-muted-foreground">—</p>;
  }

  if (!raw.includes("<")) {
    return (
      <p className="whitespace-pre-wrap text-sm text-foreground">{raw}</p>
    );
  }

  const clean = DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
  });

  if (!clean.trim() || clean === "<p></p>") {
    return <p className="text-sm text-muted-foreground">—</p>;
  }

  return (
    <div
      className={displayClassName}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
