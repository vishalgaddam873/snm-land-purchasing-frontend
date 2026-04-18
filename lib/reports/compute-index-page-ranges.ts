import type { ZoneSummaryWithDetails } from "@/components/reports/zone-summary-types";

/**
 * Fallback INDEX page ranges when DOM measurement is not available yet.
 * Prefer `measureZoneIndexPageRanges` from `measure-zone-index-pages.ts`.
 */
export function computeIndexPageRanges(
  zones: ZoneSummaryWithDetails[],
): { pageFrom: number; pageTo: number }[] {
  const DATA_TABLE_ROWS_PER_PAGE = 20;
  const SUMMARY_LINES_PER_PAGE = 40;

  const estimateSummaryLines = (zone: ZoneSummaryWithDetails): number => {
    let lines = 21;
    if (zone.sectionA.additionalUnits > 0 && zone.additionalUnitsDetails.length > 0) {
      lines += 3 + zone.additionalUnitsDetails.length;
    }
    if (
      zone.sectionA.branchesToBeRegistered > 0 &&
      zone.branchesToBeRegisteredDetails.length > 0
    ) {
      lines += 3 + zone.branchesToBeRegisteredDetails.length;
    }
    if (zone.sectionB.vacantPlots > 0 && zone.vacantPlotsDetails.length > 0) {
      lines += 3 + zone.vacantPlotsDetails.length;
    }
    return lines;
  };

  let cursor = 1;
  const out: { pageFrom: number; pageTo: number }[] = [];

  for (const zone of zones) {
    const pageFrom = cursor;
    if (zone.allProperties.length > 0) {
      const dataPages = Math.max(
        1,
        Math.ceil(zone.allProperties.length / DATA_TABLE_ROWS_PER_PAGE),
      );
      cursor += dataPages;
    }
    const summaryLines = estimateSummaryLines(zone);
    const summaryPages = Math.max(1, Math.ceil(summaryLines / SUMMARY_LINES_PER_PAGE));
    cursor += summaryPages;
    out.push({ pageFrom, pageTo: cursor - 1 });
  }

  return out;
}
