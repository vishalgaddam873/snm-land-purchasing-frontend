import type { ZoneSummaryWithDetails } from "@/components/reports/zone-summary-types";

/**
 * Fallback sheet count for INDEX + Final Summary (incl. consolidated zone table) before the
 * first zone section, when DOM measurement is not available yet.
 */
export function estimatePagesBeforeFirstZone(
  zoneMasterFilteredRowCount: number,
): number {
  const indexSheets = 1;
  const finalSummaryCoreSheets = 1;
  const masterSheets =
    zoneMasterFilteredRowCount > 0
      ? Math.max(1, Math.ceil(zoneMasterFilteredRowCount / 18))
      : 0;
  return indexSheets + finalSummaryCoreSheets + masterSheets;
}

/**
 * Fallback INDEX page ranges when DOM measurement is not available yet.
 * Prefer `measureZoneIndexPageRanges` from `measure-zone-index-pages.ts`.
 *
 * Calculates page ranges sequentially (after optional front matter):
 * Zone 1: { from: pagesBeforeFirstZone + 1, to: ... }
 * Zone 2: { from: ..., to: ... }
 * etc.
 */
export function computeIndexPageRanges(
  zones: ZoneSummaryWithDetails[],
  options?: { pagesBeforeFirstZone?: number },
): { pageFrom: number; pageTo: number }[] {
  /**
   * Estimate rows per page based on content complexity.
   * Zones with complex remarks have fewer rows per page.
   */
  const estimateRowsPerPage = (zone: ZoneSummaryWithDetails): number => {
    // Check if zone has complex content (long remarks)
    const hasLongRemarks = zone.allProperties.some(
      (p) => p.remarks && p.remarks.length > 100
    );
    // Complex zones: ~12 rows/page, Simple zones: ~18 rows/page
    return hasLongRemarks ? 12 : 18;
  };

  /** Lines that fit on one A4 landscape page for summary section */
  const SUMMARY_LINES_PER_PAGE = 32;

  /**
   * Calculate data table pages based on number of property rows and content complexity.
   * Data table has `page-break-after: always`.
   */
  const calculateDataTablePages = (zone: ZoneSummaryWithDetails): number => {
    if (zone.allProperties.length === 0) return 0;
    const rowsPerPage = estimateRowsPerPage(zone);
    return Math.max(1, Math.ceil(zone.allProperties.length / rowsPerPage));
  };

  /**
   * Calculate summary pages based on content.
   * Summary section always has at least 1 page.
   */
  const calculateSummaryPages = (zone: ZoneSummaryWithDetails): number => {
    // Base summary table: A1-A4 (5 rows) + B1-B5 with sub-items (9 rows incl. B4 × 3) + header (3 rows) = 17 lines
    let lines = 17;

    // Additional Units Details table
    if (zone.sectionA.additionalUnits > 0 && zone.additionalUnitsDetails.length > 0) {
      lines += 4 + zone.additionalUnitsDetails.length; // title + header + spacing + rows
    }

    // Branches to be Registered table
    if (
      zone.sectionA.branchesToBeRegistered > 0 &&
      zone.branchesToBeRegisteredDetails.length > 0
    ) {
      lines += 4 + zone.branchesToBeRegisteredDetails.length;
    }

    // Vacant Plots Details table
    if (zone.sectionB.vacantPlots > 0 && zone.vacantPlotsDetails.length > 0) {
      lines += 4 + zone.vacantPlotsDetails.length;
    }

    return Math.max(1, Math.ceil(lines / SUMMARY_LINES_PER_PAGE));
  };

  // Build page mapping sequentially (each zone: summary block, then master table)
  const out: { pageFrom: number; pageTo: number }[] = [];
  let currentPage = (options?.pagesBeforeFirstZone ?? 0) + 1;

  for (const zone of zones) {
    const pageFrom = currentPage;

    const summaryPages = calculateSummaryPages(zone);
    const dataPages = calculateDataTablePages(zone);
    const totalPages = summaryPages + dataPages;

    // pageTo is the last page used by this zone
    const pageTo = pageFrom + totalPages - 1;

    out.push({ pageFrom, pageTo });

    // Next zone starts after this zone ends
    currentPage = pageTo + 1;
  }

  return out;
}
