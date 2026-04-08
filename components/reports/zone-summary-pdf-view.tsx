"use client";

import {
  FullReportData,
  ZoneSummaryWithDetails,
  bhawanTypeLabel,
  vacantPlotStatusLabel,
} from "./zone-summary-types";

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

const styles = `
  .pdf-container {
    font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
    color: #000;
    background: #fff;
    padding: 24px 32px;
    max-width: 210mm;
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
    background: #c5e0b4;
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
    background: #d9ead3;
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
    background: #c5e0b4;
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

  /* Property Utilization */
  .utilization-title {
    font-size: 14px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 12px;
    padding: 8px;
    background: #f4cccc;
    border: 1px solid #666;
  }
  .utilization-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin-bottom: 24px;
  }
  .utilization-table th,
  .utilization-table td {
    border: 1px solid #555;
    padding: 8px 10px;
    text-align: left;
  }
  .utilization-table th {
    background: #f4cccc;
    font-weight: bold;
  }
  .utilization-table .sub-header {
    background: #fce5cd;
    font-weight: bold;
    text-align: center;
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
    background: #dabeda;
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
  .data-table tbody tr:nth-child(even) {
    background: #f8f8f8;
  }
  .data-table td[rowspan] {
    background: #fff;
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
    background: #e8e8e8;
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
    background: #d0d0d0;
    font-weight: bold;
    text-align: center;
  }
  .detail-table .sno {
    width: 40px;
    text-align: center;
  }
  .detail-table tbody tr:nth-child(even) {
    background: #f8f8f8;
  }

  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pdf-container {
      padding: 12px;
      max-width: none;
    }
    .page-break {
      page-break-after: always;
    }
    .page-break:last-child {
      page-break-after: auto;
    }
  }
`;

type Props = {
  reportData: FullReportData | null;
};

export function ZoneSummaryPdfView({ reportData }: Props) {
  if (!reportData || reportData.zoneSummaries.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No zone summaries available. Please select a department or zone.
      </div>
    );
  }

  const { index, overallSummary, zoneSummaries } = reportData;
  
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
            <table className="index-table">
              <thead>
                <tr>
                  <th className="sno">S. No.</th>
                  <th className="zone-no">Zone No.</th>
                  <th>Zone Name</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {index.map((z) => (
                  <tr key={z.sno}>
                    <td className="sno">{z.sno}.</td>
                    <td className="zone-no">{z.zoneNumber}</td>
                    <td>{z.zoneName}</td>
                    <td></td>
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
                <tr>
                  <td className="code-col">A2</td>
                  <td className="label-col">No. of Branches to be Registered</td>
                  <td className="value-col">{overallSummary.sectionA.branchesToBeRegistered}</td>
                </tr>
                <tr>
                  <td className="code-col">A3</td>
                  <td className="label-col">No. of Adjoining Plots</td>
                  <td className="value-col">{overallSummary.sectionA.adjoiningPlots}</td>
                </tr>
                <tr>
                  <td className="code-col">A4</td>
                  <td className="label-col">No. of Additional Units (Branches having more than one Land + Bhawan)</td>
                  <td className="value-col">{overallSummary.sectionA.additionalUnits}</td>
                </tr>
                <tr className="total-row">
                  <td className="code-col"></td>
                  <td className="label-col">Total (A1, A2, A3 & A4)</td>
                  <td className="value-col">{overallSummary.sectionA.total}</td>
                </tr>
                <tr>
                  <td className="code-col">B1</td>
                  <td className="label-col">Total No. of Bhawans</td>
                  <td className="value-col">{overallSummary.sectionB.bhawans}</td>
                </tr>
                <tr>
                  <td className="code-col">B2</td>
                  <td className="label-col">Total No. of Buildings other than Bhawan</td>
                  <td className="value-col">{overallSummary.sectionB.buildingsOtherThanBhawan}</td>
                </tr>
                <tr>
                  <td className="code-col">B3</td>
                  <td className="label-col">No. of Vacant Plots</td>
                  <td className="value-col">{overallSummary.sectionB.vacantPlots}</td>
                </tr>
                <tr>
                  <td className="code-col">B4</td>
                  <td className="label-col">No Bhawan No Plots</td>
                  <td className="value-col">{overallSummary.sectionB.noBhawanNoPlots}</td>
                </tr>
                <tr className="total-row">
                  <td className="code-col"></td>
                  <td className="label-col">Total (B1, B2, B3 & B4)</td>
                  <td className="value-col">{overallSummary.sectionB.total}</td>
                </tr>
              </tbody>
            </table>

            <div className="utilization-title">Summary of Property Details</div>
            <table className="utilization-table">
              <tbody>
                <tr>
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
                <tr>
                  <td>4. Vacant</td>
                  <td className="value-col">{overallSummary.propertyUtilization.vacant}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ZONE DATA AND SUMMARY PAGES */}
        {zoneSummaries.map((zone) => (
          <ZonePdfSection key={zone.zoneId} zone={zone} />
        ))}
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
        <div className="zone-data-page page-break">
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

                return (
                  <tr key={row.sno}>
                    {isFirst && (
                      <>
                        <td className="sno" rowSpan={rowSpan} style={{ verticalAlign: "middle" }}>
                          {row.sno}
                        </td>
                        <td className="zno" rowSpan={rowSpan} style={{ verticalAlign: "middle" }}>
                          {row.zoneNumber}
                        </td>
                        <td rowSpan={rowSpan} style={{ verticalAlign: "middle" }}>
                          {row.zoneName}
                        </td>
                        <td rowSpan={rowSpan} style={{ verticalAlign: "middle", textAlign: "center" }}>
                          {row.sectorNumber || "NA"}
                        </td>
                        <td rowSpan={rowSpan} style={{ verticalAlign: "middle" }}>
                          {row.branchName}
                        </td>
                      </>
                    )}
                    <td>{row.propertyName}</td>
                    <td>{row.areaHeld}</td>
                    <td style={{ textAlign: "center" }}>{row.constructionStatus}</td>
                    <td>{row.locatedAt}</td>
                    <td>{row.bhawanType}</td>
                    <td className="remarks">{remarkHtmlToText(row.remarks)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Zone Summary */}
      <div className="zone-summary-page page-break">
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
            <tr>
              <td className="code-col">A2</td>
              <td className="label-col">No. of Branches to be Registered</td>
              <td className="value-col">{zone.sectionA.branchesToBeRegistered}</td>
            </tr>
            <tr>
              <td className="code-col">A3</td>
              <td className="label-col">No. of Adjoining Plots</td>
              <td className="value-col">{zone.sectionA.adjoiningPlots}</td>
            </tr>
            <tr>
              <td className="code-col">A4</td>
              <td className="label-col">No. of Additional Units (Branches having more than one Land + Bhawan)</td>
              <td className="value-col">{zone.sectionA.additionalUnits}</td>
            </tr>
            <tr className="total-row">
              <td className="code-col"></td>
              <td className="label-col">Total (A1, A2, A3 & A4)</td>
              <td className="value-col">{zone.sectionA.total}</td>
            </tr>
            <tr>
              <td className="code-col">B1</td>
              <td className="label-col">Total No. of Bhawans</td>
              <td className="value-col">{zone.sectionB.bhawans}</td>
            </tr>
            <tr>
              <td className="code-col">B2</td>
              <td className="label-col">Total No. of Buildings other than Bhawan</td>
              <td className="value-col">{zone.sectionB.buildingsOtherThanBhawan}</td>
            </tr>
            <tr>
              <td className="code-col">B3</td>
              <td className="label-col">No. of Vacant Plots</td>
              <td className="value-col">{zone.sectionB.vacantPlots}</td>
            </tr>
            <tr>
              <td className="code-col">B4</td>
              <td className="label-col">No Bhawan No Plots</td>
              <td className="value-col">{zone.sectionB.noBhawanNoPlots}</td>
            </tr>
            <tr className="total-row">
              <td className="code-col"></td>
              <td className="label-col">Total (B1, B2, B3 & B4)</td>
              <td className="value-col">{zone.sectionB.total}</td>
            </tr>
          </tbody>
        </table>

        {/* Additional Units Details */}
        {zone.sectionA.additionalUnits > 0 && zone.additionalUnitsDetails.length > 0 && (
          <div className="detail-section">
            <div className="detail-title">Details of Additional Units (Bhawan/Plot)</div>
            <table className="detail-table">
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
            <table className="detail-table">
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
            <table className="detail-table">
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
                      {vacantPlotStatusLabel(row.vacantPlotStatus) ||
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
