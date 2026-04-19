import type { ZoneSummaryWithDetails } from "@/components/reports/zone-summary-types";

/**
 * Fallback INDEX page ranges when DOM measurement is not available yet.
 * Prefer `measureZoneIndexPageRanges` from `measure-zone-index-pages.ts`.
 *
 * Calculates page ranges sequentially:
 * Zone 1: { from: 1, to: 3 }
 * Zone 2: { from: 4, to: 7 }
 * etc.
 */
export function computeIndexPageRanges(
  zones: ZoneSummaryWithDetails[],
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
    // Base summary table: A1-A4 (5 rows) + B1-B5 with sub-items (8 rows) + header (3 rows) = 16 lines
    let lines = 16;

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

  // Build page mapping sequentially
  const out: { pageFrom: number; pageTo: number }[] = [];
  let currentPage = 1;

  for (const zone of zones) {
    const pageFrom = currentPage;

    // Calculate pages for this zone
    const dataPages = calculateDataTablePages(zone);
    const summaryPages = calculateSummaryPages(zone);
    const totalPages = dataPages + summaryPages;

    // pageTo is the last page used by this zone
    const pageTo = pageFrom + totalPages - 1;

    out.push({ pageFrom, pageTo });

    // Next zone starts after this zone ends
    currentPage = pageTo + 1;
  }

  return out;
}
