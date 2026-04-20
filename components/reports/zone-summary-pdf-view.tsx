"use client";

import { useLayoutEffect, useMemo, useState, type CSSProperties } from "react";
import frontPageImg from "@/assets/frontPage.jpeg";
import lastPageImg from "@/assets/lastPage.jpeg";
import {
  FullReportData,
  PropertyTableRow,
  PropertyTableRowHighlight,
  ZoneSummaryWithDetails,
  bhawanTypeLabel,
  concernedPpFromDepartmentCode,
  vacantPlotStatusLabel,
} from "./zone-summary-types";
import {
  computeIndexPageRanges,
  estimateIndexFrontMatterDisplayRanges,
  estimatePagesBeforeFirstZone,
} from "@/lib/reports/compute-index-page-ranges";
import {
  measureFrontMatterPageCount,
  measureIndexFrontMatterDisplayRanges,
  measureZoneIndexPageRanges,
  REPORT_COVER_FRONT_PAGE_COUNT,
  REPORT_LEAD_BLANK_PAGE_COUNT,
  REPORT_PRINT_BOTTOM_MARGIN_MM,
  REPORT_PRINT_SIDE_MARGIN_MM,
  REPORT_PRINT_TOP_MARGIN_MM,
  shouldDoubleTrailBlankBeforeBackCover,
  type IndexFrontMatterDisplayRanges,
} from "@/lib/reports/measure-zone-index-pages";

/** @page margin shorthand: top, right, bottom, left */
const REPORT_PAGE_MARGIN_CSS = `${REPORT_PRINT_TOP_MARGIN_MM}mm ${REPORT_PRINT_SIDE_MARGIN_MM}mm ${REPORT_PRINT_BOTTOM_MARGIN_MM}mm ${REPORT_PRINT_SIDE_MARGIN_MM}mm`;

function zoneDataCellClass(
  highlight: PropertyTableRowHighlight | undefined
): string {
  switch (highlight) {
    case "tbr":
      return "data-zone-tbr";
    case "adjoining":
      return "data-zone-adjoining";
    case "additional":
      return "data-zone-additional";
    case "vacant":
      return "data-zone-vacant";
    default:
      return "";
  }
}

function remarkHtmlToText(input: string): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";

  // Fast path: no tags
  if (!/[<>]/.test(raw)) return raw;

  // Use browser parsing (this is a client component).
  const wrapper = document.createElement("div");
  wrapper.innerHTML = raw;

  // Convert block-level elements to line breaks (common in stored remarks).
  const blockSelectors = ["p", "div", "li", "br"];
  for (const sel of blockSelectors) {
    const nodes = Array.from(wrapper.querySelectorAll(sel));
    for (const n of nodes) {
      if (n.tagName.toLowerCase() === "br") {
        n.replaceWith("\n");
      } else {
        // Ensure separation between blocks
        n.appendChild(document.createTextNode("\n"));
      }
    }
  }

  // Extract text and normalize whitespace/newlines
  const text = (wrapper.textContent ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

/** Matches backend `isNoLandAreaHeld` in reports.service (plot summary exclusion). */
function isNoLandAreaHeld(areaHeld: string | undefined | null): boolean {
  const t = String(areaHeld ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
  return t === "no land";
}

/** Structure / land type B1–B5 (aligned with dashboard detailed breakdown). */
function SectionBStructureRows({
  sectionB,
}: {
  sectionB: ZoneSummaryWithDetails["sectionB"];
}) {
  const fit = sectionB.vacantPlotsFitForConstruction ?? 0;
  const fitLater = sectionB.vacantPlotsFitForConstructionLaterStage ?? 0;
  const notFit = sectionB.notFitForConstruction;
  return (
    <>
      <tr>
        <td className="code-col">B1</td>
        <td className="label-col">
          Total No. of Bhawans and Shed (excl. under construction)
        </td>
        <td className="value-col">{sectionB.bhawans}</td>
      </tr>
      <tr>
        <td className="code-col">B2</td>
        <td className="label-col">Total No. of Buildings other than Bhawan</td>
        <td className="value-col">{sectionB.buildingsOtherThanBhawan}</td>
      </tr>
      <tr>
        <td className="code-col">B3</td>
        <td className="label-col">No. of Bhawan Under Construction</td>
        <td className="value-col">{sectionB.bhawansUnderConstruction ?? 0}</td>
      </tr>
      <tr>
        <td className="code-col">B4</td>
        <td className="label-col">No. of Vacant Plots</td>
        <td className="value-col">{sectionB.vacantPlots}</td>
      </tr>
      <tr>
        <td className="code-col"></td>
        <td className="label-col sub-label">Fit for construction</td>
        <td className="value-col">{fit}</td>
      </tr>
      <tr>
        <td className="code-col"></td>
        <td className="label-col sub-label">
          Fit for construction at later stage
        </td>
        <td className="value-col">{fitLater}</td>
      </tr>
      <tr>
        <td className="code-col"></td>
        <td className="label-col sub-label">Not fit for construction</td>
        <td className="value-col">{notFit}</td>
      </tr>
      <tr>
        <td className="code-col">B5</td>
        <td className="label-col">No Bhawan No Plots</td>
        <td className="value-col">{sectionB.noBhawanNoPlots}</td>
      </tr>
      <tr className="total-row">
        <td className="code-col"></td>
        <td className="label-col">Total (B1,B2,B3, B4 & B5)</td>
        <td className="value-col">{sectionB.total}</td>
      </tr>
    </>
  );
}

const styles = `
  /*
   * A4 landscape: 1 in top & bottom @page margins; 12mm left & right.
   * Values: REPORT_PRINT_* in lib/reports/measure-zone-index-pages.ts.
   */
  @page {
    size: A4 landscape;
    margin: ${REPORT_PAGE_MARGIN_CSS};
  }

  /* Front/back JPEG covers: full sheet, no @page inset — image stays on one page. */
  @page coverSheet {
    size: A4 landscape;
    margin: 0;
    counter-increment: lp-zone-sheet 1;
    @bottom-center {
      content: counter(lp-zone-sheet);
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
      display: table-cell;
      vertical-align: top;
      text-align: center;
      line-height: 1;
      padding-top: 3mm;
      padding-bottom: 6mm;
    }
  }

  /*
   * Intentionally blank sheets: same counter as body (counts toward total) but no footer digit.
   */
  @page blankSheet {
    size: A4 landscape;
    margin: ${REPORT_PAGE_MARGIN_CSS};
    counter-increment: lp-zone-sheet 1;
    @bottom-center {
      content: "";
    }
  }

  /*
   * Footer shows sheet number (INDEX, body, covers, etc.). Blanks use @page blankSheet.
   * counter-increment runs once per physical sheet.
   */
  @page reportPage {
    size: A4 landscape;
    margin: ${REPORT_PAGE_MARGIN_CSS};
    counter-increment: lp-zone-sheet 1;
    @bottom-center {
      content: counter(lp-zone-sheet);
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
      /*
       * table-cell + top: number stays under the rule; padding-top adds space below the line.
       */
      display: table-cell;
      vertical-align: top;
      text-align: center;
      line-height: 1;
      padding-top: 3mm;
      padding-bottom: 6mm;
    }
  }

  .pdf-container {
    font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
    color: #000;
    background: #fff;
    /*
     * Match print @page. Content width 273mm (297 − 12 − 12).
     */
    padding: ${REPORT_PAGE_MARGIN_CSS};
    max-width: 297mm;
    margin: 0 auto;
    font-size: 12px;
    box-sizing: border-box;
  }
  .page-break {
    page-break-after: always;
    margin-bottom: 48px;
  }
  .page-break:last-child {
    page-break-after: auto;
  }

  .report-pdf-cover-front,
  .report-pdf-cover-back {
    margin: 0;
    padding: 0;
    break-inside: avoid;
    page-break-inside: avoid;
    box-sizing: border-box;
    width: 100%;
    max-width: 297mm;
    aspect-ratio: 297 / 210;
    margin-left: auto;
    margin-right: auto;
    overflow: hidden;
    background: #fff;
  }
  .report-cover-full-image {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
    object-position: center;
    margin: 0;
    padding: 0;
    vertical-align: top;
  }

  /* One intentionally blank sheet before INDEX (full report only). */
  .report-blank-lead-page {
    margin: 0;
    padding: 0;
    min-height: 1px;
  }

  /* INDEX PAGE */
  .index-page {
    margin-bottom: 40px;
  }
  .index-title {
    font-size: 23px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 24px;
    padding: 12px;
    background: #92CDDC;
    border: 1px solid #666;
  }
  .index-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .index-table th,
  .index-table td {
    border: 1px solid #555;
    padding: 8px 10px;
    text-align: left;
  }
  .index-table th {
    background: #92CDDC;
    font-weight: bold;
    text-align: center;
  }
  .index-table .sno {
    width: 60px;
    text-align: center;
  }
  .index-table .zone-no {
    width: 80px;
    text-align: center;
  }
  .index-table .lp-report-index-page-col {
    width: 110px;
    min-width: 110px;
    text-align: center;
    white-space: nowrap;
  }
  .index-table td.index-section-heading {
    font-weight: bold;
    text-decoration: underline;
    background: #f0f0f0;
    text-align: left;
  }
  .index-table td.index-concerned-pp {
    text-align: center;
  }

  /* FINAL SUMMARY PAGE */
  .final-summary-page {
    margin-bottom: 40px;
  }
  .final-summary-title {
    font-size: 19px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 20px;
    padding: 10px;
    background: #C4D79B;
    border: 1px solid #666;
    text-decoration: underline;
  }
  .summary-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
    font-size: 13px;
  }
  .summary-table th,
  .summary-table td {
    border: 1px solid #555;
    padding: 8px 10px;
    text-align: left;
  }
  .summary-table th {
    background: #d0d0d0;
    font-weight: bold;
  }
  .summary-table .code-col {
    width: 50px;
    text-align: center;
    font-weight: bold;
    background: #f5f5f5;
  }
  .summary-table .label-col {
    width: 65%;
  }
  .summary-table .label-col.sub-label {
    padding-left: 28px;
    font-size: 12px;
    font-weight: normal;
    color: #333;
  }
  .summary-table .value-col {
    width: auto;
    text-align: right;
    font-weight: 600;
    padding-right: 16px;
  }
  .summary-table .total-row {
    background: #d9d9d9;
    font-weight: bold;
  }
  .summary-table tr.summary-row-tbr td {
    background: #fff;
  }
  .summary-table tr.summary-row-adjoining td {
    background: #fff;
  }
  .summary-table tr.summary-row-additional td {
    background: #fff;
  }

  /* Property Utilization (reference PDF palette) */
  .lp-utilization-keep-together {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .utilization-title {
    font-size: 15px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 12px;
    padding: 8px;
    background: #e2c2c2;
    border: 1px solid #666;
    text-decoration: underline;
  }
  .utilization-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin-bottom: 24px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .utilization-table tbody {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .utilization-table tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .utilization-table tr.utilization-row-vacant {
    page-break-before: avoid;
    break-before: avoid;
  }
  .utilization-table th,
  .utilization-table td {
    border: 1px solid #555;
    padding: 8px 10px;
    text-align: left;
  }
  .utilization-table th {
    background: #fff;
    font-weight: bold;
  }
  .utilization-table tr.utilization-row-total td {
    background: #e1ead2;
  }
  .utilization-table .sub-header td {
    background: #ffcc33;
    font-weight: bold;
    text-align: center;
  }
  .utilization-table tr.utilization-row-vacant td {
    background: #fff;
  }
  .utilization-table .utilization-vacant-label-cell {
    vertical-align: top;
  }
  .utilization-table .utilization-vacant-title {
    font-weight: normal;
    margin-bottom: 8px;
  }
  .utilization-table .utilization-vacant-sub {
    padding: 3px 0 3px 1em;
  }
  .utilization-table .utilization-vacant-sub + .utilization-vacant-sub {
    border-top: 1px solid #ccc;
    padding-top: 6px;
    margin-top: 3px;
  }
  .utilization-table .utilization-dual-values {
    vertical-align: top;
    padding: 6px 10px;
    text-align: left;
    font-weight: normal;
  }
  .utilization-table .utilization-vacant-value-spacer {
    min-height: 1.55em;
    margin-bottom: 8px;
  }
  .utilization-table .utilization-dual-line {
    text-align: left;
    font-weight: normal;
    padding: 3px 0;
  }
  .utilization-table .utilization-dual-line + .utilization-dual-line {
    border-top: 1px solid #ccc;
    padding-top: 6px;
    margin-top: 3px;
  }

  /* ZONE MASTER (all zones, one table) */
  .zone-master-page {
    margin-top: 28px;
    margin-bottom: 40px;
  }
  .zone-master-title {
    font-size: 17px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 16px;
    padding: 10px;
    background: #d9e1f2;
    border: 1px solid #666;
  }

  /* ZONE DATA TABLE */
  .zone-data-page {
    margin-bottom: 40px;
  }
  .zone-data-title {
    font-size: 17px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 16px;
    padding: 10px;
    background: #cfe2f3;
    border: 1px solid #666;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }
  .data-table th,
  .data-table td {
    border: 1px solid #555;
    padding: 5px 6px;
    text-align: left;
    vertical-align: top;
  }
  .data-table td.remarks {
    white-space: pre-wrap;
    word-break: break-word;
  }
  .data-table th {
    background: #CCC0DA;
    font-weight: bold;
    text-align: center;
  }
  .data-table .sno {
    width: 35px;
    text-align: center;
  }
  .data-table .zno {
    width: 35px;
    text-align: center;
  }
  .data-table td[rowspan] {
    border-bottom: 1px solid #555;
  }
  .data-table td.data-table-rowspan-no-bottom {
    border-bottom: none !important;
  }

  /*
   * One full-width 1px rule under tbody (rowspan + collapse). No filled bar — avoids
   * a thick “double” edge next to cell borders in print/PDF.
   */
  .data-table tbody tr:last-child > td,
  .data-table tbody tr:last-child > th {
    border-bottom: none;
  }
  .data-table tfoot td.data-table-foot-close {
    padding: 0;
    height: 0;
    line-height: 0;
    font-size: 0;
    vertical-align: top;
    border: none !important;
    border-top: 1px solid #555 !important;
    background: transparent !important;
  }

  /* ZONE SUMMARY */
  .zone-summary-page {
    margin-bottom: 40px;
  }

  .zone-header {
    font-size: 17px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 16px;
    padding: 10px 16px;
    background: linear-gradient(180deg, #e8e8e8 0%, #d0d0d0 100%);
    border: 1px solid #888;
    border-radius: 4px;
  }

  /* Detail Tables */
  .detail-section {
    margin-top: 24px;
    margin-bottom: 16px;
    /* Keep entire detail section (title + table) together on one page */
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .detail-title {
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 8px;
    padding: 6px 10px;
    background: #E5EEE4;
    border: 1px solid #888;
    border-radius: 3px;
    /* Keep title with the table that follows */
    break-after: avoid;
    page-break-after: avoid;
  }
  .detail-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    /* Prevent table from splitting across pages */
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .detail-table th,
  .detail-table td {
    border: 1px solid #555;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }
  .detail-table td.remarks {
    white-space: pre-wrap;
    word-break: break-word;
  }
  .detail-table th {
    background: #CCC0DA;
    font-weight: bold;
    text-align: center;
  }
  .detail-table .sno {
    width: 40px;
    text-align: center;
  }
  .detail-table.detail-body-additional tbody tr {
    background: #BFBFBF;
  }
  .detail-table.detail-body-tbr tbody tr {
    background: #C4D79B;
  }
  .detail-table.detail-body-vacant tbody tr {
    background: #FEFD99;
  }

  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pdf-container {
      /* Use @page margin instead of container padding */
      padding: 0;
      max-width: none;
    }
    .page-break {
      page-break-after: always;
    }
    .page-break:last-child {
      page-break-after: auto;
    }

    .report-pdf-cover-front,
    .report-pdf-cover-back {
      page: coverSheet;
      width: 297mm;
      height: 210mm;
      max-width: 297mm;
      max-height: 210mm;
      min-height: 210mm;
      margin: 0;
      padding: 0;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .report-pdf-cover-front .report-cover-full-image,
    .report-pdf-cover-back .report-cover-full-image {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      object-position: center;
    }

    .report-blank-lead-page,
    .report-blank-trail-page {
      page: blankSheet;
      page-break-after: always;
      break-after: page;
    }

    .index-page {
      page: reportPage;
      page-break-after: always;
      break-after: page;
    }

    .final-summary-page {
      page: reportPage;
    }

    /* Master property table always begins on its own sheet after Final Summary / utilization */
    .lp-report-index-zone-master-block {
      break-before: page;
      page-break-before: always;
    }

    .zone-data-page,
    .zone-summary-page {
      page: reportPage;
    }

    /* Keep detail sections (title + table) together on one page in print */
    .detail-section {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .detail-title {
      break-after: avoid !important;
      page-break-after: avoid !important;
    }
    .detail-table {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    /* Detail tables: no tfoot hairline — keep last-row bottom visible in print. */
    .detail-table tbody tr:last-child > td,
    .detail-table tbody tr:last-child > th {
      border-bottom: 1px solid #555 !important;
    }
  }
`;

/** Zero-size node after consolidated table (print layout anchor). */
const ZONE_NUMBERING_ANCHOR_STYLE: CSSProperties = {
  height: 0,
  overflow: "hidden",
  margin: 0,
  padding: 0,
  border: 0,
  fontSize: 0,
  lineHeight: 0,
};

type Props = {
  reportData: FullReportData | null;
};

/** Inline-only styles so INDEX columns always render (some browsers drop `<style>` blocks that mix `@page` + invalid rules). */
const INDEX_TABLE_STYLE: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  tableLayout: "fixed",
};

function indexCellStyle(align: "left" | "center" = "left"): CSSProperties {
  return {
    border: "1px solid #555",
    padding: "8px 10px",
    textAlign: align,
    verticalAlign: "middle",
    background: "#fff",
    color: "#000",
  };
}

function indexHeaderStyle(align: "left" | "center" = "left"): CSSProperties {
  return {
    ...indexCellStyle(align),
    background: "#92CDDC",
    fontWeight: 700,
  };
}

function formatReportIndexPageNo(n: number): string {
  return String(Math.max(1, Math.round(n))).padStart(2, "0");
}

/** Overall Summary rows: no single PP when the report spans all departments. */
function indexConcernedPpOverall(departmentCode: string | undefined): string {
  const c = String(departmentCode ?? "").trim();
  if (!c) return "-";
  return concernedPpFromDepartmentCode(c);
}

/** Merge S.No. / Z.No. / zone / branch cells for consecutive rows in the same zone + branch group. */
function masterTableMergeGroupKey(row: PropertyTableRow): string {
  return `${row.zoneNumber}\u0001${row.branchName}`;
}

/**
 * "Details of All Zones Properties" drops No-Land rows but kept backend `sno` (global across zones,
 * includes filtered branches). Renumber 1, 2, 3… for each visible branch block in table order.
 */
function renumberZoneMasterTableSerials(
  rows: PropertyTableRow[],
): PropertyTableRow[] {
  let sno = 0;
  let lastKey = "";
  return rows.map((row) => {
    const key = masterTableMergeGroupKey(row);
    if (key !== lastKey) {
      sno += 1;
      lastKey = key;
    }
    return { ...row, sno };
  });
}

export function ZoneSummaryPdfView({ reportData }: Props) {
  const [domPageRanges, setDomPageRanges] = useState<Map<
    string,
    { pageFrom: number; pageTo: number }
  > | null>(null);
  const [indexFrontMatterMeasured, setIndexFrontMatterMeasured] =
    useState<IndexFrontMatterDisplayRanges | null>(null);
  /**
   * Measured need for a second trail blank (see {@link shouldDoubleTrailBlankBeforeBackCover}).
   */
  const [doubleTrailBlankMeasured, setDoubleTrailBlankMeasured] = useState<
    boolean | null
  >(null);

  useLayoutEffect(() => {
    if (!reportData?.zoneSummaries?.length) {
      const clearId = requestAnimationFrame(() => {
        setDomPageRanges(null);
        setIndexFrontMatterMeasured(null);
        setDoubleTrailBlankMeasured(null);
      });
      return () => cancelAnimationFrame(clearId);
    }

    const summaries = reportData.zoneSummaries;

    const measure = () => {
      const root = document.getElementById("pdf-content");
      if (!root) return;
      if (root instanceof HTMLElement && summaries.length > 1) {
        setIndexFrontMatterMeasured(measureIndexFrontMatterDisplayRanges(root));
      } else {
        setIndexFrontMatterMeasured(null);
      }
      const zps = root.querySelector(".zone-pages-start");
      if (!zps || !(zps instanceof HTMLElement)) return;
      const ids = summaries.map((z) => z.zoneId);
      const front =
        root instanceof HTMLElement ? measureFrontMatterPageCount(root) : 0;
      const m = measureZoneIndexPageRanges(zps, ids, front);
      setDomPageRanges(m);
      setDoubleTrailBlankMeasured(shouldDoubleTrailBlankBeforeBackCover(zps, ids, front));
    };

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(measure);
    });

    const root = document.getElementById("pdf-content");
    const zps = root?.querySelector(".zone-pages-start");
    const ro =
      zps instanceof HTMLElement
        ? new ResizeObserver(() => {
            requestAnimationFrame(measure);
          })
        : null;
    if (ro && zps) {
      ro.observe(zps);
      if (root) ro.observe(root);
    }

    if (typeof window !== "undefined") {
      window.addEventListener("beforeprint", measure);
    }

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      ro?.disconnect();
      if (typeof window !== "undefined") {
        window.removeEventListener("beforeprint", measure);
      }
    };
  }, [reportData]);

  const allZoneMasterRows = useMemo(() => {
    const summaries = reportData?.zoneSummaries;
    if (!summaries?.length) return [];
    const filtered = summaries
      .flatMap((z) => z.allProperties)
      .filter((row) => !isNoLandAreaHeld(row.areaHeld));
    return renumberZoneMasterTableSerials(filtered);
  }, [reportData?.zoneSummaries]);

  const indexFrontDisplay = useMemo(() => {
    if (!reportData?.zoneSummaries?.length || reportData.zoneSummaries.length < 2) {
      return null;
    }
    return (
      indexFrontMatterMeasured ??
      estimateIndexFrontMatterDisplayRanges(allZoneMasterRows.length)
    );
  }, [
    reportData?.zoneSummaries?.length,
    indexFrontMatterMeasured,
    allZoneMasterRows.length,
  ]);

  /** Must run before any early return (Rules of Hooks). */
  const indexWithPages = useMemo(() => {
    const summaries = reportData?.zoneSummaries;
    if (!summaries?.length) return [];
    const pagesBeforeFirstZone =
      summaries.length > 1
        ? estimatePagesBeforeFirstZone(allZoneMasterRows.length)
        : REPORT_COVER_FRONT_PAGE_COUNT;
    const fallback = computeIndexPageRanges(summaries, {
      pagesBeforeFirstZone,
    });
    const zoneBaseSno =
      2 + (summaries.length > 1 && allZoneMasterRows.length > 0 ? 1 : 0);
    return summaries.map((z, i) => {
      const dom = domPageRanges?.get(z.zoneId);
      const rawFrom = dom?.pageFrom ?? fallback[i]?.pageFrom ?? 1;
      const rawTo = dom?.pageTo ?? fallback[i]?.pageTo ?? 1;
      return {
        sno: zoneBaseSno + i,
        zoneId: z.zoneId,
        zoneNumber: z.zoneNumber,
        zoneName: z.zoneName,
        departmentCode: z.departmentCode ?? "",
        pageFrom: Math.max(1, rawFrom),
        pageTo: Math.max(1, rawTo),
      };
    });
  }, [reportData, domPageRanges, allZoneMasterRows.length]);

  const estimatedLastZoneContentPage = useMemo(
    () => Math.max(...indexWithPages.map((z) => z.pageTo), 1),
    [indexWithPages],
  );

  const doubleTrailBlankBeforeBackCover =
    doubleTrailBlankMeasured ?? estimatedLastZoneContentPage % 2 === 1;
  const trailBlankPageCountBeforeBackCover = doubleTrailBlankBeforeBackCover ? 2 : 1;

  if (!reportData || reportData.zoneSummaries.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {!reportData ? (
          <>
            Select a <span className="font-medium text-foreground">department</span>
            , and optionally a{" "}
            <span className="font-medium text-foreground">zone</span>, then the
            report will load here.
          </>
        ) : (
          "No zone summaries for this selection."
        )}
      </div>
    );
  }

  const { overallSummary, zoneSummaries } = reportData;

  // Hide INDEX, Final Summary, and Summary of Property Details when a specific zone is selected
  const isSpecificZone = zoneSummaries.length === 1;

  return (
    <>
      <style>{styles}</style>
      <div className="pdf-container" id="pdf-content">
        <div className="report-pdf-cover-front page-break">
          <img
            src={frontPageImg.src}
            width={frontPageImg.width}
            height={frontPageImg.height}
            alt=""
            className="report-cover-full-image"
          />
        </div>
        {/* INDEX PAGE - Hidden when specific zone selected */}
        {!isSpecificZone && indexFrontDisplay && (
          <>
            {Array.from({ length: REPORT_LEAD_BLANK_PAGE_COUNT }, (_, i) => (
              <div
                key={`report-blank-lead-${i}`}
                className="report-blank-lead-page page-break"
                aria-hidden={true}
              />
            ))}
            <div className="index-page page-break">
            <div className="index-title">INDEX</div>
            <table className="index-table" style={INDEX_TABLE_STYLE}>
              <colgroup>
                <col style={{ width: "52px" }} />
                <col />
                <col style={{ width: "56px" }} />
                <col style={{ width: "56px" }} />
                <col style={{ width: "100px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    scope="col"
                    style={indexHeaderStyle("center")}
                  >
                    S.No.
                  </th>
                  <th rowSpan={2} scope="col" style={indexHeaderStyle("left")}>
                    Details
                  </th>
                  <th
                    colSpan={2}
                    scope="colgroup"
                    style={indexHeaderStyle("center")}
                  >
                    Page No.
                  </th>
                  <th rowSpan={2} scope="col" style={indexHeaderStyle("center")}>
                    Concerned PP
                  </th>
                </tr>
                <tr>
                  <th scope="col" style={indexHeaderStyle("center")}>
                    From
                  </th>
                  <th scope="col" style={indexHeaderStyle("center")}>
                    To
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    className="index-section-heading"
                    colSpan={5}
                    style={indexCellStyle("left")}
                  >
                    Overall Summary
                  </td>
                </tr>
                <tr data-lp-index-row="final-summary-core">
                  <td style={{ ...indexCellStyle("center"), fontWeight: 600 }}>
                    1.
                  </td>
                  <td style={indexCellStyle("left")}>Final Summary</td>
                  <td
                    style={{
                      ...indexCellStyle("center"),
                      fontWeight: 600,
                    }}
                    data-lp-page-from
                  >
                    {formatReportIndexPageNo(
                      indexFrontDisplay.finalSummaryCore.pageFrom,
                    )}
                  </td>
                  <td
                    style={{
                      ...indexCellStyle("center"),
                      fontWeight: 600,
                    }}
                    data-lp-page-to
                  >
                    {formatReportIndexPageNo(
                      indexFrontDisplay.finalSummaryCore.pageTo,
                    )}
                  </td>
                  <td
                    className="index-concerned-pp"
                    style={indexCellStyle("center")}
                  >
                    {indexConcernedPpOverall(overallSummary.departmentCode)}
                  </td>
                </tr>
                {allZoneMasterRows.length > 0 &&
                  indexFrontDisplay.allZonesProperties && (
                    <tr data-lp-index-row="all-zones-properties">
                      <td style={{ ...indexCellStyle("center"), fontWeight: 600 }}>
                        2.
                      </td>
                      <td style={indexCellStyle("left")}>
                        {
                          "Details of Properties Held (Sum of Bhawans, Sheds, Buildings & Vacant Plots)"
                        }
                      </td>
                      <td
                        style={{
                          ...indexCellStyle("center"),
                          fontWeight: 600,
                        }}
                        data-lp-page-from
                      >
                        {formatReportIndexPageNo(
                          indexFrontDisplay.allZonesProperties.pageFrom,
                        )}
                      </td>
                      <td
                        style={{
                          ...indexCellStyle("center"),
                          fontWeight: 600,
                        }}
                        data-lp-page-to
                      >
                        {formatReportIndexPageNo(
                          indexFrontDisplay.allZonesProperties.pageTo,
                        )}
                      </td>
                      <td
                        className="index-concerned-pp"
                        style={indexCellStyle("center")}
                      >
                        {indexConcernedPpOverall(overallSummary.departmentCode)}
                      </td>
                    </tr>
                  )}
                <tr>
                  <td
                    className="index-section-heading"
                    colSpan={5}
                    style={indexCellStyle("left")}
                  >
                    Zone Wise Details
                  </td>
                </tr>
                {indexWithPages.map((z) => (
                  <tr key={z.zoneId} data-lp-index-zone-id={z.zoneId}>
                    <td style={{ ...indexCellStyle("center"), fontWeight: 600 }}>
                      {z.sno}.
                    </td>
                    <td style={indexCellStyle("left")}>
                      Zone {z.zoneNumber}, {z.zoneName}
                    </td>
                    <td
                      style={{
                        ...indexCellStyle("center"),
                        fontWeight: 600,
                      }}
                      data-lp-page-from
                    >
                      {formatReportIndexPageNo(z.pageFrom)}
                    </td>
                    <td
                      style={{
                        ...indexCellStyle("center"),
                        fontWeight: 600,
                      }}
                      data-lp-page-to
                    >
                      {formatReportIndexPageNo(z.pageTo)}
                    </td>
                    <td
                      className="index-concerned-pp"
                      style={indexCellStyle("center")}
                    >
                      {concernedPpFromDepartmentCode(z.departmentCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* FINAL SUMMARY PAGE - Hidden when specific zone selected */}
        {!isSpecificZone && (
          <div className="final-summary-page page-break">
            <div className="lp-report-index-final-summary-core">
              <div className="final-summary-title">Final Summary</div>

              <table className="summary-table">
              <tbody>
                <tr>
                  <td className="code-col">A1</td>
                  <td className="label-col">No. of Registered Branches</td>
                  <td className="value-col">{overallSummary.sectionA.registeredBranches}</td>
                </tr>
                <tr className="summary-row-tbr">
                  <td className="code-col">A2</td>
                  <td className="label-col">No. of Branches to be Registered</td>
                  <td className="value-col">{overallSummary.sectionA.branchesToBeRegistered}</td>
                </tr>
                <tr className="summary-row-adjoining">
                  <td className="code-col">A3</td>
                  <td className="label-col">No. of Adjoining Plots</td>
                  <td className="value-col">{overallSummary.sectionA.adjoiningPlots}</td>
                </tr>
                <tr className="summary-row-additional">
                  <td className="code-col">A4</td>
                  <td className="label-col">No. of Additional Units (Branches having more than one Land + Bhawan)</td>
                  <td className="value-col">{overallSummary.sectionA.additionalUnits}</td>
                </tr>
                <tr className="total-row">
                  <td className="code-col"></td>
                  <td className="label-col">Total (A1, A2, A3 & A4)</td>
                  <td className="value-col">{overallSummary.sectionA.total}</td>
                </tr>
                <SectionBStructureRows sectionB={overallSummary.sectionB} />
              </tbody>
            </table>

            <div className="lp-utilization-keep-together">
              <div className="utilization-title">Summary of Property Details</div>
              <table className="utilization-table">
                <tbody>
                  <tr className="utilization-row-total">
                    <td className="label-col"><strong>Total No. of Plots</strong></td>
                    <td className="value-col"><strong>{overallSummary.propertyUtilization.totalPlots}</strong></td>
                  </tr>
                  <tr className="sub-header">
                    <td colSpan={2}>Utilization of {overallSummary.propertyUtilization.totalPlots} Plots</td>
                  </tr>
                  <tr>
                    <td>1. Bhawans</td>
                    <td className="value-col">{overallSummary.propertyUtilization.bhawans}</td>
                  </tr>
                  <tr>
                    <td>2. Sheds</td>
                    <td className="value-col">{overallSummary.propertyUtilization.sheds}</td>
                  </tr>
                  <tr>
                    <td>3. Buildings</td>
                    <td className="value-col">{overallSummary.propertyUtilization.buildings}</td>
                  </tr>
                  <tr>
                    <td>4. Under Constructions</td>
                    <td className="value-col">
                      {overallSummary.propertyUtilization.bhawansUnderConstruction ?? 0}
                    </td>
                  </tr>
                  <tr className="utilization-row-vacant">
                    <td className="utilization-vacant-label-cell">
                      <div className="utilization-vacant-title">5. Vacant</div>
                      <div className="utilization-vacant-sub">
                        a. Vacant with Self Made Sheds
                      </div>
                      <div className="utilization-vacant-sub">b. Fully Vacant</div>
                    </td>
                    <td className="value-col utilization-dual-values">
                      <div className="utilization-vacant-value-spacer" aria-hidden />
                      <div className="utilization-dual-line">
                        {overallSummary.propertyUtilization.selfMadeSheds ?? 0}
                      </div>
                      <div className="utilization-dual-line">
                        {overallSummary.propertyUtilization.vacant ?? 0}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            </div>

            {allZoneMasterRows.length > 0 && (
              <div className="lp-report-index-zone-master-block zone-master-page">
                <div className="zone-master-title">Details of All Zones Properties</div>
                <MasterPropertyDataTable
                  rows={allZoneMasterRows}
                  rowKeyPrefix="zone-master"
                  variant="zoneMaster"
                />
              </div>
            )}

            <div
              className="lp-report-zone-numbering-start"
              aria-hidden
              style={ZONE_NUMBERING_ANCHOR_STYLE}
            />
          </div>
        )}

        {/* ZONE DATA AND SUMMARY PAGES (dept-wide: numbering already started on Final Summary) */}
        <div className="zone-pages-start">
          {zoneSummaries.map((zone) => (
            <ZonePdfSection key={zone.zoneId} zone={zone} />
          ))}
        </div>

        {Array.from({ length: trailBlankPageCountBeforeBackCover }, (_, i) => (
          <div
            key={`report-blank-trail-${i}`}
            className="report-blank-trail-page page-break"
            aria-hidden={true}
          />
        ))}
        <div className="report-pdf-cover-back page-break">
          <img
            src={lastPageImg.src}
            width={lastPageImg.width}
            height={lastPageImg.height}
            alt=""
            className="report-cover-full-image"
          />
        </div>
      </div>
    </>
  );
}

type MergedRowInfo = {
  rowIndex: number;
  isFirstOfGroup: boolean;
  rowSpan: number;
};

function computeMergeInfo(properties: PropertyTableRow[]): Map<number, MergedRowInfo> {
  const mergeMap = new Map<number, MergedRowInfo>();

  if (properties.length === 0) return mergeMap;

  let groupStart = 0;
  let currentKey = masterTableMergeGroupKey(properties[0]);

  for (let i = 1; i <= properties.length; i++) {
    const isEnd = i === properties.length;
    const branchChanged =
      !isEnd && masterTableMergeGroupKey(properties[i]) !== currentKey;

    if (isEnd || branchChanged) {
      const groupSize = i - groupStart;
      for (let j = groupStart; j < i; j++) {
        mergeMap.set(j, {
          rowIndex: j,
          isFirstOfGroup: j === groupStart,
          rowSpan: groupSize,
        });
      }
      if (!isEnd) {
        groupStart = i;
        currentKey = masterTableMergeGroupKey(properties[i]);
      }
    }
  }

  return mergeMap;
}

function MasterPropertyDataTable({
  rows,
  rowKeyPrefix,
  variant = "full",
}: {
  rows: PropertyTableRow[];
  rowKeyPrefix: string;
  variant?: "full" | "zoneMaster";
}) {
  const mergeInfo = computeMergeInfo(rows);
  const isZoneMaster = variant === "zoneMaster";
  const dataTableColumnCount = isZoneMaster ? 6 : 11;

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th className="sno">S.No.</th>
          <th className="zno">Z.No.</th>
          <th>Zone Name</th>
          {!isZoneMaster && <th>Sector No.</th>}
          <th>Branch Name</th>
          {!isZoneMaster && <th>Property Details</th>}
          <th>Dimenssions of Plot Held (Area)</th>
          {!isZoneMaster && (
            <th>
              Bhawan Constructed or Not / Under Construction / Not Applicable
            </th>
          )}
          {!isZoneMaster && <th>Located at (Place)</th>}
          <th>
            Utilization of Plots (Bhawan / Building / Shed / Self made shed /
            Vacant / Not Applicable)
          </th>
          {!isZoneMaster && <th>Remarks</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => {
          const info = mergeInfo.get(idx);
          const isFirst = info?.isFirstOfGroup ?? true;
          const rowSpan = info?.rowSpan ?? 1;
          const zc = zoneDataCellClass(row.rowHighlight);
          const lastRowIndex = rows.length - 1;
          const rowspanClosesTable =
            isFirst && idx + rowSpan - 1 === lastRowIndex;
          const rowspanFootCls = rowspanClosesTable
            ? "data-table-rowspan-no-bottom"
            : "";

          return (
            <tr key={`${rowKeyPrefix}-${idx}`}>
              {isFirst && (
                <>
                  <td
                    className={["sno", zc, rowspanFootCls].filter(Boolean).join(" ")}
                    rowSpan={rowSpan}
                    style={{ verticalAlign: "middle" }}
                  >
                    {row.sno}
                  </td>
                  <td
                    className={["zno", zc, rowspanFootCls].filter(Boolean).join(" ")}
                    rowSpan={rowSpan}
                    style={{ verticalAlign: "middle" }}
                  >
                    {row.zoneNumber}
                  </td>
                  <td
                    className={[zc, rowspanFootCls].filter(Boolean).join(" ")}
                    rowSpan={rowSpan}
                    style={{ verticalAlign: "middle" }}
                  >
                    {row.zoneName}
                  </td>
                  {!isZoneMaster && (
                    <td
                      className={[zc, rowspanFootCls].filter(Boolean).join(" ")}
                      rowSpan={rowSpan}
                      style={{ verticalAlign: "middle", textAlign: "center" }}
                    >
                      {row.sectorNumber || "NA"}
                    </td>
                  )}
                  <td
                    className={[zc, rowspanFootCls].filter(Boolean).join(" ")}
                    rowSpan={rowSpan}
                    style={{ verticalAlign: "middle" }}
                  >
                    {row.branchName}
                  </td>
                </>
              )}
              {!isZoneMaster && <td className={zc}>{row.propertyName}</td>}
              <td className={zc}>{row.areaHeld}</td>
              {!isZoneMaster && (
                <td className={zc} style={{ textAlign: "center" }}>
                  {row.constructionStatus}
                </td>
              )}
              {!isZoneMaster && <td className={zc}>{row.locatedAt}</td>}
              <td className={zc}>{row.bhawanType}</td>
              {!isZoneMaster && (
                <td className={["remarks", zc].filter(Boolean).join(" ")}>
                  {remarkHtmlToText(row.remarks)}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr aria-hidden={true}>
          <td
            className="data-table-foot-close"
            colSpan={dataTableColumnCount}
          />
        </tr>
      </tfoot>
    </table>
  );
}

function ZonePdfSection({ zone }: { zone: ZoneSummaryWithDetails }) {
  const hasDataTable = zone.allProperties.length > 0;

  return (
    <>
      {/* Zone summary (A/B counts + detail tables) before the master property table */}
      <div
        className="zone-summary-page page-break"
        data-lp-zone-id={zone.zoneId}
      >
        <div className="zone-header">
          Summary : Zone {zone.zoneNumber} ({zone.zoneName})
        </div>

        <table className="summary-table">
          <tbody>
            <tr>
              <td className="code-col">A1</td>
              <td className="label-col">No. of Registered Branches</td>
              <td className="value-col">{zone.sectionA.registeredBranches}</td>
            </tr>
            <tr className="summary-row-tbr">
              <td className="code-col">A2</td>
              <td className="label-col">No. of Branches to be Registered</td>
              <td className="value-col">{zone.sectionA.branchesToBeRegistered}</td>
            </tr>
            <tr className="summary-row-adjoining">
              <td className="code-col">A3</td>
              <td className="label-col">No. of Adjoining Plots</td>
              <td className="value-col">{zone.sectionA.adjoiningPlots}</td>
            </tr>
            <tr className="summary-row-additional">
              <td className="code-col">A4</td>
              <td className="label-col">No. of Additional Units (Branches having more than one Land + Bhawan)</td>
              <td className="value-col">{zone.sectionA.additionalUnits}</td>
            </tr>
            <tr className="total-row">
              <td className="code-col"></td>
              <td className="label-col">Total (A1, A2, A3 & A4)</td>
              <td className="value-col">{zone.sectionA.total}</td>
            </tr>
            <SectionBStructureRows sectionB={zone.sectionB} />
          </tbody>
        </table>

        {/* Additional Units Details */}
        {zone.sectionA.additionalUnits > 0 && zone.additionalUnitsDetails.length > 0 && (
          <div className="detail-section">
            <div className="detail-title">Details of Additional Units (Bhawan/Plot)</div>
            <table className="detail-table detail-body-additional">
              <thead>
                <tr>
                  <th className="sno">S.No.</th>
                  <th>Branch Name</th>
                  <th>Details of Extra Units</th>
                  <th>Type of Property</th>
                </tr>
              </thead>
              <tbody>
                {zone.additionalUnitsDetails.map((row, i) => (
                  <tr key={i}>
                    <td className="sno">{i + 1}</td>
                    <td>{row.branchName}</td>
                    <td>{row.propertyName}</td>
                    <td>{bhawanTypeLabel(row.bhawanType)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Branches to be Registered */}
        {zone.sectionA.branchesToBeRegistered > 0 && zone.branchesToBeRegisteredDetails.length > 0 && (
          <div className="detail-section">
            <div className="detail-title">New Branches to be Registered</div>
            <table className="detail-table detail-body-tbr">
              <thead>
                <tr>
                  <th className="sno">S.No.</th>
                  <th>Branch Name</th>
                  <th>Property Details</th>
                  <th>Dimenssions of Plot Held (Area)</th>
                  <th>Located at (Place)</th>
                  <th>
                    Utilization of Plots (Bhawan / Building / Shed / Self made
                    shed / Vacant / Not Applicable)
                  </th>
                </tr>
              </thead>
              <tbody>
                {zone.branchesToBeRegisteredDetails.map((row, i) => (
                  <tr key={i}>
                    <td className="sno">{i + 1}</td>
                    <td>{row.branchName}</td>
                    <td>{row.propertyName}</td>
                    <td>{row.areaHeld}</td>
                    <td>{row.locatedAt}</td>
                    <td>{bhawanTypeLabel(row.bhawanType)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Vacant Plots Details */}
        {zone.sectionB.vacantPlots > 0 && zone.vacantPlotsDetails.length > 0 && (
          <div className="detail-section">
            <div className="detail-title">Details of Vacant Plots</div>
            <table className="detail-table detail-body-vacant">
              <thead>
                <tr>
                  <th className="sno">S.No.</th>
                  <th>Branch Name</th>
                  <th>Details of Vacant Plots</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {zone.vacantPlotsDetails.map((row, i) => (
                  <tr key={i}>
                    <td className="sno">{i + 1}</td>
                    <td>{row.branchName}</td>
                    <td>{row.areaHeld}</td>
                    <td className="remarks">
                      {vacantPlotStatusLabel(row.vacantPlotStatus) || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Master zone property listing */}
      {hasDataTable && (
        <div
          className="zone-data-page page-break"
          data-lp-zone-id={zone.zoneId}
        >
          <div className="zone-data-title">
            Zone {zone.zoneNumber} : {zone.zoneName}
          </div>
          <MasterPropertyDataTable
            rows={zone.allProperties}
            rowKeyPrefix={zone.zoneId}
          />
        </div>
      )}
    </>
  );
}
