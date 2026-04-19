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

type ImportUpdateRow = {
  excelRow: number;
  propertyName: string;
  branchName: string;
  field: string;
  previousValue: string;
  newValue: string;
};

type ImportResult = {
  sheetName?: string;
  inserted?: number;
  updated?: number;
  skipped?: ImportIssue[];
  errors?: ImportIssue[];
  message?: string;
  importReportXlsxBase64?: string;
  importReportFilename?: string;
  importReportUpdates?: ImportUpdateRow[];
};

function downloadBase64AsXlsx(base64: string, filename: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "property-import-updated.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string): string {
  const s = String(value ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Opens cleanly in Excel; same columns as the server “Updated” sheet. */
function downloadUpdatesAsCsv(rows: ImportUpdateRow[], filename: string) {
  const headers = [
    "Excel row",
    "Property name",
    "Branch name",
    "Field",
    "Previous value",
    "New value",
  ];
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((r) =>
      [
        String(r.excelRow),
        r.propertyName,
        r.branchName,
        r.field,
        r.previousValue,
        r.newValue,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ];
  const blob = new Blob(["\ufeff" + lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadImportUpdatesReport(data: ImportResult) {
  const base = (
    data.importReportFilename ?? "property-import-updated"
  ).replace(/\.xlsx$/i, "");
  if (data.importReportXlsxBase64?.length) {
    downloadBase64AsXlsx(
      data.importReportXlsxBase64,
      `${base}.xlsx`,
    );
    return;
  }
  const rows = data.importReportUpdates;
  if (rows?.length) {
    downloadUpdatesAsCsv(rows, `${base}.csv`);
    return;
  }
}

export function PropertiesBulkExcelControls({
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
      const res = await fetch("/api/properties/import/sample", {
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
      a.download = "property-import-sample.xlsx";
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
      const res = await fetch("/api/properties/import", {
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
        <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-4 overflow-hidden sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Import finished</DialogTitle>
            <DialogDescription>
              Sheet: {result?.sheetName ?? "—"}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto text-sm">
            <p>
              <span className="font-medium">Inserted:</span>{" "}
              {result?.inserted ?? 0}
              {" · "}
              <span className="font-medium">Updated:</span>{" "}
              {result?.updated ?? 0}
            </p>
            {(result?.importReportXlsxBase64?.length ?? 0) > 0 ||
            (result?.importReportUpdates?.length ?? 0) > 0 ? (
              <p className="text-muted-foreground">
                Use{" "}
                <span className="font-medium">Download updated fields</span>{" "}
                below to save a file of changed fields (Excel or CSV).
              </p>
            ) : (result?.updated ?? 0) > 0 ? (
              <p className="text-muted-foreground">
                No change report — updated rows already matched the database (no
                tracked field differences).
              </p>
            ) : null}
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
          <DialogFooter className="!flex-row flex-shrink-0 flex-wrap justify-end gap-2 rounded-b-xl border-t bg-muted/50 p-4 -mx-4 -mb-4">
            {(result?.importReportXlsxBase64?.length ?? 0) > 0 ||
            (result?.importReportUpdates?.length ?? 0) > 0 ? (
              <Button
                type="button"
                className="rounded-xl"
                onClick={() => {
                  if (!result) return;
                  try {
                    downloadImportUpdatesReport(result);
                  } catch {
                    window.alert("Could not download the updated-fields file.");
                  }
                }}
              >
                <FileDown className="mr-2 size-4 shrink-0" />
                Download updated fields
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
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
