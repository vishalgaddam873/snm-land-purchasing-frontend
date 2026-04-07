"use client";

import { cn } from "@/lib/utils";
import { FileUp } from "lucide-react";
import * as React from "react";

export function FileDropzone({
  label = "Drag & drop files here",
  hint = "PDF, PNG or JPG — up to 10 MB each",
  className,
}: {
  label?: string;
  hint?: string;
  className?: string;
}) {
  const [active, setActive] = React.useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onDragEnter={() => setActive(true)}
      onDragLeave={() => setActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setActive(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors",
        active && "border-primary/50 bg-primary/5",
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-xl bg-card text-primary shadow-sm ring-1 ring-border/80">
        <FileUp className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <input
        type="file"
        multiple
        className="sr-only"
        aria-label="Upload files"
        onChange={() => undefined}
      />
    </div>
  );
}
