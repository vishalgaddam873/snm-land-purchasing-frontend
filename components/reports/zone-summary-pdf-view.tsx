"use client";

import { useLayoutEffect, useMemo, useState, type CSSProperties } from "react";
import {
  FullReportData,
  PropertyTableRowHighlight,
  ZoneSummaryWithDetails,
  bhawanTypeLabel,
  vacantPlotStatusLabel,
} from "./zone-summary-types";
import { computeIndexPageRanges } from "@/lib/reports/compute-index-page-ranges";
import { measureZoneIndexPageRanges } from "@/lib/reports/measure-zone-index-pages";

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

/** Structure / land type B1–B5 (aligned with dashboard detailed breakdown). */
function SectionBStructureRows({
  sectionB,
}: {
  sectionB: ZoneSummaryWithDetails["sectionB"];
}) {
  const fit = sectionB.vacantPlotsFitForConstruction ?? 0;
  const notFit = sectionB.notFitForConstruction;
  const sms = sectionB.vacantPlotsSelfMadeShed ?? 0;
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
        <td className="label-col sub-label">Not fit for construction</td>
        <td className="value-col">{notFit}</td>
      </tr>
      <tr>
        <td className="code-col"></td>
        <td className="label-col sub-label">
          Self made sheds (with vacant plot status)
        </td>
        <td className="value-col">{sms}</td>
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
  /* Force A4 landscape printing with margins */
  @page {
    size: A4 landscape;
    margin: 12mm;
  }

  /* Pages WITHOUT page numbers (Index + Final Summary) */
  @page noNumber {
    size: A4 landscape;
    margin: 12mm;
    @top-center {
      content: "";
    }
  }

  /*
   * Zone-only sheet counter (INDEX + Final Summary use @page noNumber — they must not advance this).
   * counter(page) always counts every physical sheet; in Chrome, resetting it for margin boxes is unreliable.
   */
  @page reportPage {
    size: A4 landscape;
    margin: 12mm;
    counter-increment: lp-zone-sheet 1;
    @top-center {
      content: counter(lp-zone-sheet);
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 10px;
      color: #000;
    }
  }

  .pdf-container {
    font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
    color: #000;
    background: #fff;
    padding: 24px 32px;
    /* A4 landscape width = 297mm */
    max-width: 297mm;
    margin: 0 auto;
    font-size: 11px;
  }
  .page-break {
    page-break-after: always;
    margin-bottom: 48px;
  }
  .page-break:last-child {
    page-break-after: auto;
  }

  /* INDEX PAGE */
  .index-page {
    margin-bottom: 40px;
  }
  .index-title {
    font-size: 22px;
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
    font-size: 12px;
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

  /* FINAL SUMMARY PAGE */
  .final-summary-page {
    margin-bottom: 40px;
  }
  .final-summary-title {
    font-size: 18px;
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
    font-size: 12px;
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
    font-size: 11px;
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
    font-size: 14px;
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
    font-size: 12px;
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

  /* ZONE DATA TABLE */
  .zone-data-page {
    margin-bottom: 40px;
  }
  .zone-data-title {
    font-size: 16px;
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
    font-size: 10px;
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

  /* ZONE SUMMARY */
  .zone-summary-page {
    margin-bottom: 40px;
  }

  .zone-header {
    font-size: 16px;
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
  }
  .detail-title {
    font-size: 13px;
    font-weight: bold;
    margin-bottom: 8px;
    padding: 6px 10px;
    background: #E5EEE4;
    border: 1px solid #888;
    border-radius: 3px;
  }
  .detail-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
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
    background: #E2FC20;
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

    /* Assign page types */
    .index-page,
    .final-summary-page {
      page: noNumber;
    }

    .zone-data-page,
    .zone-summary-page {
      page: reportPage;
    }

    /*
     * First zone sheet should show "1" after INDEX + Final Summary (incl. Summary of Property Details).
     * Reset lp-zone-sheet after front matter; also on .zone-pages-start so single-zone reports work.
     */
    .lp-report-zone-numbering-start,
    .zone-pages-start {
      counter-reset: lp-zone-sheet 0;
      /* Fallback where @page counter-increment is not applied to lp-zone-sheet */
      counter-set: lp-zone-sheet 0;
    }
  }
`;

/** Zero-size node after Final Summary so print layout applies counter reset before zone blocks. */
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
  fontSize: 12,
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

export function ZoneSummaryPdfView({ reportData }: Props) {
  const [domPageRanges, setDomPageRanges] = useState<Map<
    string,
    { pageFrom: number; pageTo: number }
  > | null>(null);

  useLayoutEffect(() => {
    if (!reportData?.zoneSummaries?.length) {
      const clearId = requestAnimationFrame(() => setDomPageRanges(null));
      return () => cancelAnimationFrame(clearId);
    }

    const summaries = reportData.zoneSummaries;

    const measure = () => {
      const root = document.getElementById("pdf-content");
      if (!root) return;
      const zps = root.querySelector(".zone-pages-start");
      if (!zps || !(zps instanceof HTMLElement)) return;
      const ids = summaries.map((z) => z.zoneId);
      const m = measureZoneIndexPageRanges(zps, ids);
      setDomPageRanges(m);
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

  /** Must run before any early return (Rules of Hooks). */
  const indexWithPages = useMemo(() => {
    const summaries = reportData?.zoneSummaries;
    if (!summaries?.length) return [];
    const fallback = computeIndexPageRanges(summaries);
    return summaries.map((z, i) => {
      const dom = domPageRanges?.get(z.zoneId);
      return {
        sno: i + 1,
        zoneNumber: z.zoneNumber,
        zoneName: z.zoneName,
        pageFrom: dom?.pageFrom ?? fallback[i]?.pageFrom ?? 1,
        pageTo: dom?.pageTo ?? fallback[i]?.pageTo ?? 1,
      };
    });
  }, [reportData, domPageRanges]);

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
        {/* INDEX PAGE - Hidden when specific zone selected */}
        {!isSpecificZone && (
          <div className="index-page page-break">
            <div className="index-title">INDEX</div>
            <table className="index-table" style={INDEX_TABLE_STYLE}>
              <colgroup>
                <col style={{ width: "64px" }} />
                <col style={{ width: "88px" }} />
                <col />
                <col style={{ width: "64px" }} />
                <col style={{ width: "64px" }} />
                <col style={{ width: "16%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    scope="col"
                    style={indexHeaderStyle("center")}
                  >
                    S. No.
                  </th>
                  <th
                    rowSpan={2}
                    scope="col"
                    style={indexHeaderStyle("center")}
                  >
                    Zone No.
                  </th>
                  <th rowSpan={2} scope="col" style={indexHeaderStyle("left")}>
                    Zone Name
                  </th>
                  <th
                    colSpan={2}
                    scope="colgroup"
                    style={indexHeaderStyle("center")}
                  >
                    Page No
                  </th>
                  <th rowSpan={2} scope="col" style={indexHeaderStyle("left")}>
                    Remarks
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
                {indexWithPages.map((z) => (
                  <tr key={z.sno}>
                    <td style={{ ...indexCellStyle("center"), width: "64px" }}>
                      {z.sno}.
                    </td>
                    <td style={{ ...indexCellStyle("center"), width: "88px" }}>
                      {z.zoneNumber}
                    </td>
                    <td style={indexCellStyle("left")}>{z.zoneName}</td>
                    <td
                      style={{
                        ...indexCellStyle("center"),
                        width: "64px",
                        minWidth: "64px",
                        fontWeight: 600,
                      }}
                    >
                      {z.pageFrom}
                    </td>
                    <td
                      style={{
                        ...indexCellStyle("center"),
                        width: "64px",
                        minWidth: "64px",
                        fontWeight: 600,
                      }}
                    >
                      {z.pageTo}
                    </td>
                    <td style={indexCellStyle("left")} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* FINAL SUMMARY PAGE - Hidden when specific zone selected */}
        {!isSpecificZone && (
          <div className="final-summary-page page-break">
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
                    <td>2. Buildings</td>
                    <td className="value-col">{overallSummary.propertyUtilization.buildings}</td>
                  </tr>
                  <tr>
                    <td>3. Sheds</td>
                    <td className="value-col">{overallSummary.propertyUtilization.sheds}</td>
                  </tr>
                  <tr className="utilization-row-vacant">
                    <td>4. Vacant</td>
                    <td className="value-col">{overallSummary.propertyUtilization.vacant}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* End of front matter: reset zone-only margin counter before first zone table */}
            <div
              className="lp-report-zone-numbering-start"
              aria-hidden
              style={ZONE_NUMBERING_ANCHOR_STYLE}
            />
          </div>
        )}

        {/* ZONE DATA AND SUMMARY PAGES (page numbering starts here) */}
        <div className="zone-pages-start">
          {zoneSummaries.map((zone) => (
            <ZonePdfSection key={zone.zoneId} zone={zone} />
          ))}
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

function computeMergeInfo(
  properties: ZoneSummaryWithDetails["allProperties"]
): Map<number, MergedRowInfo> {
  const mergeMap = new Map<number, MergedRowInfo>();
  
  if (properties.length === 0) return mergeMap;

  let groupStart = 0;
  let currentBranch = properties[0].branchName;

  for (let i = 1; i <= properties.length; i++) {
    const isEnd = i === properties.length;
    const branchChanged = !isEnd && properties[i].branchName !== currentBranch;

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
        currentBranch = properties[i].branchName;
      }
    }
  }

  return mergeMap;
}

function ZonePdfSection({ zone }: { zone: ZoneSummaryWithDetails }) {
  const mergeInfo = computeMergeInfo(zone.allProperties);

  return (
    <>
      {/* Zone Data Table */}
      {zone.allProperties.length > 0 && (
        <div
          className="zone-data-page page-break"
          data-lp-zone-id={zone.zoneId}
        >
          <div className="zone-data-title">
            Zone {zone.zoneNumber} : {zone.zoneName}
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th className="sno">S.No.</th>
                <th className="zno">Z.No.</th>
                <th>Zone Name</th>
                <th>Sector No.</th>
                <th>Branch Name</th>
                <th>Property Details</th>
                <th>Details of Properties Held (Area)</th>
                <th>Bhawan Constructed or Not / Under Construction</th>
                <th>Located at (Place)</th>
                <th>Type of Bhawan : Building or Shed</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {zone.allProperties.map((row, idx) => {
                const info = mergeInfo.get(idx);
                const isFirst = info?.isFirstOfGroup ?? true;
                const rowSpan = info?.rowSpan ?? 1;
                const zc = zoneDataCellClass(row.rowHighlight);

                return (
                  <tr key={`${zone.zoneId}-${idx}`}>
                    {isFirst && (
                      <>
                        <td
                          className={["sno", zc].filter(Boolean).join(" ")}
                          rowSpan={rowSpan}
                          style={{ verticalAlign: "middle" }}
                        >
                          {row.sno}
                        </td>
                        <td
                          className={["zno", zc].filter(Boolean).join(" ")}
                          rowSpan={rowSpan}
                          style={{ verticalAlign: "middle" }}
                        >
                          {row.zoneNumber}
                        </td>
                        <td
                          className={zc}
                          rowSpan={rowSpan}
                          style={{ verticalAlign: "middle" }}
                        >
                          {row.zoneName}
                        </td>
                        <td
                          className={zc}
                          rowSpan={rowSpan}
                          style={{ verticalAlign: "middle", textAlign: "center" }}
                        >
                          {row.sectorNumber || "NA"}
                        </td>
                        <td
                          className={zc}
                          rowSpan={rowSpan}
                          style={{ verticalAlign: "middle" }}
                        >
                          {row.branchName}
                        </td>
                      </>
                    )}
                    <td className={zc}>{row.propertyName}</td>
                    <td className={zc}>{row.areaHeld}</td>
                    <td className={zc} style={{ textAlign: "center" }}>
                      {row.constructionStatus}
                    </td>
                    <td className={zc}>{row.locatedAt}</td>
                    <td className={zc}>{row.bhawanType}</td>
                    <td className={["remarks", zc].filter(Boolean).join(" ")}>
                      {remarkHtmlToText(row.remarks)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Zone Summary */}
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
                  <th>Details of Properties Held (Area)</th>
                  <th>Located at (Place)</th>
                  <th>Type of Bhawan : Building or Shed</th>
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
                      {row.bhawanType === "self_made_shed"
                        ? `Self made shed — ${vacantPlotStatusLabel(row.vacantPlotStatus) || remarkHtmlToText(row.remarks)}`
                        : vacantPlotStatusLabel(row.vacantPlotStatus) ||
                          remarkHtmlToText(row.remarks)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </>
  );
}
