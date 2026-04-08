"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileUp, FileDown } from "lucide-react";
import * as React from "react";

type ImportIssue = {
  excelRow: number;
  reason?: string;
  error?: string;
  mapped: Record<string, string>;
};

type ImportResult = {
  sheetName?: string;
  inserted?: number;
  updated?: number;
  skipped?: ImportIssue[];
  errors?: ImportIssue[];
  message?: string;
};

export function BranchesBulkExcelControls({
  onImported,
}: {
  onImported: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [sampleLoading, setSampleLoading] = React.useState(false);
  const [uploadLoading, setUploadLoading] = React.useState(false);
  const [resultOpen, setResultOpen] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);

  async function downloadSample() {
    setSampleLoading(true);
    try {
      const res = await fetch("/api/branches/import/sample", {
        credentials: "include",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        window.alert(j.message ?? `Download failed (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "branch-import-sample.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setSampleLoading(false);
    }
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/branches/import", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as ImportResult & {
        message?: string;
      };
      if (!res.ok) {
        window.alert(data.message ?? `Import failed (${res.status})`);
        return;
      }
      setResult(data);
      setResultOpen(true);
      onImported();
    } finally {
      setUploadLoading(false);
    }
  }

  const skipped = result?.skipped ?? [];
  const errors = result?.errors ?? [];

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={onFileSelected}
      />
      <Button
        type="button"
        variant="outline"
        className="h-12 shrink-0 rounded-xl px-4"
        disabled={sampleLoading}
        onClick={() => void downloadSample()}
      >
        <FileDown className="mr-2 size-4 shrink-0" />
        {sampleLoading ? "Preparing…" : "Sample Excel"}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-12 shrink-0 rounded-xl px-4"
        disabled={uploadLoading}
        onClick={() => inputRef.current?.click()}
      >
        <FileUp className="mr-2 size-4 shrink-0" />
        {uploadLoading ? "Importing…" : "Import Excel"}
      </Button>

      <DesktopImportResultDialog
        open={resultOpen}
        onOpenChange={setResultOpen}
        result={result}
        skipped={skipped}
        errors={errors}
      />
    </>
  );
}

/** Keep dialog separate so tree-shaking / SSR boundaries stay simple */
function DesktopImportResultDialog({
  open,
  onOpenChange,
  result,
  skipped,
  errors,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ImportResult | null;
  skipped: ImportIssue[];
  errors: ImportIssue[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Branch import result</DialogTitle>
          <DialogDescription>
            {result?.sheetName ? `Sheet: ${result.sheetName}` : null}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            <span className="font-medium text-foreground">Inserted:</span>{" "}
            {result?.inserted ?? 0}
            {" · "}
            <span className="font-medium text-foreground">Updated:</span>{" "}
            {result?.updated ?? 0}
          </p>
          {skipped.length ? (
            <div>
              <p className="font-medium text-foreground">
                Skipped ({skipped.length})
              </p>
              <ul className="mt-1 max-h-40 list-inside list-disc overflow-y-auto text-muted-foreground">
                {skipped.map((s, i) => (
                  <li key={i}>
                    Row {s.excelRow}: {s.reason ?? s.error ?? "unknown"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {errors.length ? (
            <div>
              <p className="font-medium text-destructive">
                Errors ({errors.length})
              </p>
              <ul className="mt-1 max-h-40 list-inside list-disc overflow-y-auto text-muted-foreground">
                {errors.map((s, i) => (
                  <li key={i}>
                    Row {s.excelRow}: {s.error ?? s.reason ?? "unknown"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
