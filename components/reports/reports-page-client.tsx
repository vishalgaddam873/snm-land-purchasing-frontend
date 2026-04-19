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

/** Sentinel: include all departments (no departmentId query param). */
const DEPARTMENT_ALL_VALUE = "__all_departments__";

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
      // Only set departmentId if a specific department is selected (not "All")
      if (selectedDepartment !== DEPARTMENT_ALL_VALUE) {
        params.set("departmentId", selectedDepartment);
      }
      if (selectedZone.trim()) {
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

  const filteredZones = zones.filter(
    (z) =>
      !selectedDepartment.trim() ||
      selectedDepartment === DEPARTMENT_ALL_VALUE ||
      z.departmentId === selectedDepartment,
  );

  const departmentTriggerLabel = useMemo(() => {
    if (!selectedDepartment.trim()) return null;
    if (selectedDepartment === DEPARTMENT_ALL_VALUE) return "All Departments";
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

    // Remove any existing print iframe
    const existingIframe = document.getElementById("print-iframe");
    if (existingIframe) {
      existingIframe.remove();
    }

    // Create a hidden iframe for printing (stays on same page)
    const iframe = document.createElement("iframe");
    iframe.id = "print-iframe";
    iframe.style.position = "fixed";
    iframe.style.top = "-10000px";
    iframe.style.left = "-10000px";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc || !iframe.contentWindow) {
      iframe.remove();
      return;
    }

    const printPrepScript = String.raw`
      (() => {
        const REPORT_ZONE_PAGE_CONTENT_HEIGHT_PX = (210 - 24) * (96 / 25.4);
        const EFFECTIVE_PAGE_HEIGHT_PX = REPORT_ZONE_PAGE_CONTENT_HEIGHT_PX * 1.10;

        function gapAfter(current, next) {
          if (!next) return 0;
          const gap = next.getBoundingClientRect().top - current.getBoundingClientRect().bottom;
          return gap > 0 ? gap : 0;
        }

        function collectBlocks(sectionEl) {
          const blocks = [];

          for (const child of Array.from(sectionEl.children)) {
            if (!(child instanceof HTMLElement)) continue;

            if (
              child.classList.contains("zone-data-title") ||
              child.classList.contains("zone-header")
            ) {
              blocks.push({ kind: "standalone", element: child });
              continue;
            }

            if (
              child.classList.contains("data-table") ||
              child.classList.contains("summary-table")
            ) {
              blocks.push({ kind: "table", element: child });
              continue;
            }

            if (child.classList.contains("detail-section")) {
              const title = child.querySelector(":scope > .detail-title");
              if (title instanceof HTMLElement) {
                blocks.push({ kind: "standalone", element: title });
              }

              const table = child.querySelector(":scope > .detail-table");
              if (table instanceof HTMLElement) {
                blocks.push({ kind: "table", element: table });
              }
            }
          }

          return blocks;
        }

        function collectAtoms(sectionEl) {
          const blocks = collectBlocks(sectionEl);
          const atoms = [];
          let nextTableId = 0;

          for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const nextBlock = blocks[i + 1];
            const trailingGap = gapAfter(block.element, nextBlock && nextBlock.element);

            if (block.kind === "standalone") {
              atoms.push({
                kind: "standalone",
                height: block.element.getBoundingClientRect().height + trailingGap,
              });
              continue;
            }

            const tableId = nextTableId++;
            const thead = block.element.querySelector(":scope > thead");
            const rows = Array.from(
              block.element.querySelectorAll(":scope > tbody > tr"),
            ).filter((row) => row instanceof HTMLElement);

            if (thead instanceof HTMLElement) {
              atoms.push({
                kind: "tableHead",
                tableId,
                height: thead.getBoundingClientRect().height,
              });
            }

            rows.forEach((row, rowIndex) => {
              atoms.push({
                kind: "tableRow",
                tableId,
                height:
                  row.getBoundingClientRect().height +
                  (rowIndex === rows.length - 1 ? trailingGap : 0),
              });
            });

            if (rows.length === 0 && atoms.length > 0) {
              atoms[atoms.length - 1].height += trailingGap;
            }
          }

          return atoms;
        }

        function simulatePagesForSection(sectionEl) {
          const atoms = collectAtoms(sectionEl);

          if (atoms.length === 0) {
            return Math.max(
              1,
              Math.ceil(sectionEl.getBoundingClientRect().height / EFFECTIVE_PAGE_HEIGHT_PX),
            );
          }

          const repeatedHeadHeights = new Map();
          for (const atom of atoms) {
            if (atom.kind === "tableHead") {
              repeatedHeadHeights.set(atom.tableId, atom.height);
            }
          }

          let pageCount = 1;
          let currentPageUsed = 0;
          let tablesOnCurrentPage = new Set();
          const tablesStarted = new Set();

          for (const atom of atoms) {
            const repeatedHeadHeight =
              atom.kind === "tableRow" &&
              tablesStarted.has(atom.tableId) &&
              !tablesOnCurrentPage.has(atom.tableId)
                ? repeatedHeadHeights.get(atom.tableId) || 0
                : 0;

            const requiredHeight = atom.height + repeatedHeadHeight;

            if (currentPageUsed > 0 && currentPageUsed + requiredHeight > EFFECTIVE_PAGE_HEIGHT_PX) {
              pageCount += 1;
              currentPageUsed = 0;
              tablesOnCurrentPage = new Set();
            }

            if (
              atom.kind === "tableRow" &&
              tablesStarted.has(atom.tableId) &&
              !tablesOnCurrentPage.has(atom.tableId)
            ) {
              currentPageUsed += repeatedHeadHeights.get(atom.tableId) || 0;
            }

            currentPageUsed += atom.height;

            if (atom.kind === "tableHead" || atom.kind === "tableRow") {
              tablesOnCurrentPage.add(atom.tableId);
              tablesStarted.add(atom.tableId);
            }
          }

          return Math.max(1, pageCount);
        }

        function measureZoneIndexPageRanges(zonePagesStart, zoneIds) {
          const zoneSections = new Map();

          for (const child of Array.from(zonePagesStart.children)) {
            if (!(child instanceof HTMLElement)) continue;
            const zoneId = child.dataset.lpZoneId;
            if (!zoneId) continue;

            const existing = zoneSections.get(zoneId) || {
              dataPage: null,
              summaryPage: null,
            };

            if (child.classList.contains("zone-data-page")) {
              existing.dataPage = child;
            } else if (child.classList.contains("zone-summary-page")) {
              existing.summaryPage = child;
            }

            zoneSections.set(zoneId, existing);
          }

          const out = new Map();
          let currentPage = 1;

          for (const zoneId of zoneIds) {
            const sections = zoneSections.get(zoneId);
            if (!sections) continue;

            const pageFrom = currentPage;
            const summaryPages = sections.summaryPage
              ? simulatePagesForSection(sections.summaryPage)
              : 1;
            const dataPages = sections.dataPage ? simulatePagesForSection(sections.dataPage) : 0;
            const totalPages = summaryPages + dataPages;
            const pageTo = pageFrom + totalPages - 1;

            out.set(zoneId, { pageFrom, pageTo });
            currentPage = pageTo + 1;
          }

          return out;
        }

        function applyMeasuredIndex() {
          const root = document.getElementById("pdf-content");
          const zonePagesStart = root && root.querySelector(".zone-pages-start");
          if (!(root instanceof HTMLElement) || !(zonePagesStart instanceof HTMLElement)) return;

          const rows = Array.from(
            root.querySelectorAll("[data-lp-index-zone-id]"),
          ).filter((row) => row instanceof HTMLElement);
          if (!rows.length) return;

          const zoneIds = rows
            .map((row) => row.dataset.lpIndexZoneId)
            .filter((zoneId) => typeof zoneId === "string" && zoneId.length > 0);
          if (!zoneIds.length) return;

          const ranges = measureZoneIndexPageRanges(zonePagesStart, zoneIds);
          rows.forEach((row) => {
            const zoneId = row.dataset.lpIndexZoneId;
            if (!zoneId) return;
            const range = ranges.get(zoneId);
            if (!range) return;

            const fromCell = row.querySelector("[data-lp-page-from]");
            const toCell = row.querySelector("[data-lp-page-to]");
            if (fromCell) fromCell.textContent = String(range.pageFrom);
            if (toCell) toCell.textContent = String(range.pageTo);
          });
        }

        // Apply index measurement and trigger print
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            applyMeasuredIndex();
            setTimeout(() => {
              window.print();
            }, 100);
          });
        });
      })();
    `;

    const styles = Array.from(document.querySelectorAll("style"))
      .map((s) => s.outerHTML)
      .join("");

    iframeDoc.open();
    iframeDoc.write(`
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
          <script>${printPrepScript}</script>
        </body>
      </html>
    `);
    iframeDoc.close();
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
              <SelectItem value={DEPARTMENT_ALL_VALUE}>
                All Departments
              </SelectItem>
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
              (selectedDepartment !== DEPARTMENT_ALL_VALUE && filteredZones.length === 0)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={
                selectedDepartment === DEPARTMENT_ALL_VALUE
                  ? "Optional — leave empty for all zones"
                  : "Optional — leave empty for all zones"
              }>
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
