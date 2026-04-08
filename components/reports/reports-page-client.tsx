"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Printer, Loader2, RefreshCw } from "lucide-react";
import {
  DepartmentOption,
  ZoneOption,
  FullReportData,
} from "./zone-summary-types";
import { ZoneSummaryPdfView } from "./zone-summary-pdf-view";

export function ReportsPageClient() {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [reportData, setReportData] = useState<FullReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const fetchOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const res = await fetch("/api/reports/departments-with-zones");
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments ?? []);
        setZones(data.zones ?? []);
      }
    } catch {
      // ignore
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDepartment && selectedDepartment !== "all") {
        params.set("departmentId", selectedDepartment);
      }
      if (selectedZone && selectedZone !== "all") {
        params.set("zoneId", selectedZone);
      }
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/reports/full-report${suffix}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        setReportData(null);
      }
    } catch {
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment, selectedZone]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const filteredZones = zones.filter((z) =>
    selectedDepartment === "all" ? true : z.departmentId === selectedDepartment
  );

  const handlePrint = () => {
    const content = document.getElementById("pdf-content");
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const styles = Array.from(document.querySelectorAll("style"))
      .map((s) => s.outerHTML)
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Zone Summary Report</title>
          ${styles}
          <style>
            body { margin: 0; padding: 0; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${content.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-56">
          <label className="mb-1.5 block text-sm font-medium">
            Department
          </label>
          <Select
            value={selectedDepartment}
            onValueChange={(v) => {
              if (v) {
                setSelectedDepartment(v);
                setSelectedZone("all");
              }
            }}
            disabled={optionsLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d._id} value={d._id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-56">
          <label className="mb-1.5 block text-sm font-medium">Zone</label>
          <Select
            value={selectedZone}
            onValueChange={(v) => v && setSelectedZone(v)}
            disabled={optionsLoading || filteredZones.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              {filteredZones.map((z) => (
                <SelectItem key={z._id} value={z._id}>
                  Zone {z.zoneNumber} ({z.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchReport}
          disabled={loading}
          className="h-9"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          <span className="ml-1.5">Refresh</span>
        </Button>

        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={loading || !reportData || reportData.zoneSummaries.length === 0}
            className="h-9"
          >
            <Printer className="size-4" />
            <span className="ml-1.5">Print / Save PDF</span>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="bg-white overflow-auto max-h-[80vh]">
            <ZoneSummaryPdfView reportData={reportData} />
          </div>
        )}
      </Card>
    </div>
  );
}
