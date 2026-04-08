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
import { FileDown, FileUp } from "lucide-react";
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

export function ZonesBulkExcelControls({
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
      const res = await fetch("/api/zones/import/sample", {
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
      a.download = "zone-import-sample.xlsx";
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
      const res = await fetch("/api/zones/import", {
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

      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Zone import finished</DialogTitle>
            <DialogDescription>
              Sheet: {result?.sheetName ?? "—"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-medium">Inserted:</span>{" "}
              {result?.inserted ?? 0}
              {" · "}
              <span className="font-medium">Updated:</span>{" "}
              {result?.updated ?? 0}
            </p>
            {skipped.length > 0 ? (
              <div>
                <p className="font-medium text-muted-foreground">
                  Skipped rows ({skipped.length})
                </p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-muted-foreground">
                  {skipped.slice(0, 15).map((s) => (
                    <li key={s.excelRow}>
                      Row {s.excelRow}: {s.reason}
                    </li>
                  ))}
                  {skipped.length > 15 ? (
                    <li>… and {skipped.length - 15} more</li>
                  ) : null}
                </ul>
              </div>
            ) : null}
            {errors.length > 0 ? (
              <div>
                <p className="font-medium text-destructive">
                  Errors ({errors.length})
                </p>
                <ul className="mt-1 list-inside list-disc space-y-1">
                  {errors.slice(0, 20).map((s) => (
                    <li key={s.excelRow}>
                      Row {s.excelRow}: {s.error}
                    </li>
                  ))}
                  {errors.length > 20 ? (
                    <li className="text-muted-foreground">
                      … and {errors.length - 20} more
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              className="rounded-xl"
              onClick={() => setResultOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
