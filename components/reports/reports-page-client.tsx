"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

/** Sentinel: include all zones for the selected department (no zoneId query param). */
const ZONE_ALL_VALUE = "__all_zones__";

export function ReportsPageClient() {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  /** Empty until the user picks a department (no default). */
  const [selectedDepartment, setSelectedDepartment] = useState("");
  /** Empty = all zones in the selected department (optional narrow). */
  const [selectedZone, setSelectedZone] = useState("");
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
    if (!selectedDepartment.trim()) {
      setReportData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("departmentId", selectedDepartment);
      if (selectedZone.trim()) {
        params.set("zoneId", selectedZone);
      }
      const suffix = `?${params.toString()}`;
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

  const filteredZones = zones.filter(
    (z) =>
      !selectedDepartment.trim() ||
      z.departmentId === selectedDepartment,
  );

  const departmentTriggerLabel = useMemo(() => {
    if (!selectedDepartment.trim()) return null;
    const d = departments.find((x) => x._id === selectedDepartment);
    return d ? `${d.name} (${d.code})` : null;
  }, [selectedDepartment, departments]);

  const zoneTriggerLabel = useMemo(() => {
    if (!selectedZone.trim()) return null;
    const z = filteredZones.find((x) => x._id === selectedZone);
    return z ? `Zone ${z.zoneNumber} (${z.name})` : null;
  }, [selectedZone, filteredZones]);

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
    <div className="h-full overflow-hidden space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-[280px]">
          <label className="mb-1.5 block text-sm font-medium">
            Department
          </label>
          <Select
            value={selectedDepartment === "" ? undefined : selectedDepartment}
            onValueChange={(v) => {
              if (v) {
                setSelectedDepartment(v);
                setSelectedZone("");
              }
            }}
            disabled={optionsLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select department">
                {departmentTriggerLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d._id} value={d._id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[280px]">
          <label className="mb-1.5 block text-sm font-medium">
            Zone <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Select
            value={
              selectedDepartment.trim() && selectedZone.trim()
                ? selectedZone
                : undefined
            }
            onValueChange={(v) => {
              if (!v) return;
              setSelectedZone(v === ZONE_ALL_VALUE ? "" : v);
            }}
            disabled={
              optionsLoading ||
              !selectedDepartment.trim() ||
              filteredZones.length === 0
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Optional — leave empty for all zones">
                {zoneTriggerLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ZONE_ALL_VALUE}>
                All zones in this department
              </SelectItem>
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
          disabled={loading || !selectedDepartment.trim()}
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
            disabled={
              loading ||
              !selectedDepartment.trim() ||
              !reportData ||
              reportData.zoneSummaries.length === 0
            }
            className="h-9"
          >
            <Printer className="size-4" />
            <span className="ml-1.5">Print / Save PDF</span>
          </Button>
        </div>
      </div>

      <Card className="h-[calc(100vh-320px)] overflow-hidden rounded-2xl border-border/80 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="h-full bg-white overflow-auto">
            <ZoneSummaryPdfView reportData={reportData} />
          </div>
        )}
      </Card>
    </div>
  );
}
