/**
 * Accurate INDEX "Page No" From/To calculation by simulating print pagination.
 *
 * We paginate atomic pieces of each zone section in DOM order.
 * Each zone prints: summary block (counts + detail tables), then the master property table.
 * Per-section atoms include:
 * - section titles / headers
 * - table heads
 * - table rows
 *
 * This lets us account for the browser behavior that matters here:
 * - rows do not split across pages
 * - thead repeats on continuation pages
 * - actual visual gaps between blocks contribute to consumed page space
 */

/** 1 inch in millimetres (print/PDF). */
const MM_PER_INCH = 25.4;

/**
 * Top @page margin (mm): 1 in — binding / flip-up gutter on A4 landscape.
 * Keep in sync with `@page` margins in `zone-summary-pdf-view.tsx`.
 */
export const REPORT_PRINT_TOP_MARGIN_MM = MM_PER_INCH;

/** Bottom @page margin (mm): 1 in. */
export const REPORT_PRINT_BOTTOM_MARGIN_MM = MM_PER_INCH;

/** Left and right @page margins (mm). */
export const REPORT_PRINT_SIDE_MARGIN_MM = 12;

/** A4 landscape height (210mm) minus top and bottom @page margins. */
export const PRINTABLE_HEIGHT_MM =
  210 - REPORT_PRINT_TOP_MARGIN_MM - REPORT_PRINT_BOTTOM_MARGIN_MM;

/** CSS px per mm at 96dpi */
const PX_PER_MM = 96 / 25.4; // ~3.78

/** A4 landscape page content height in pixels */
export const REPORT_ZONE_PAGE_CONTENT_HEIGHT_PX = PRINTABLE_HEIGHT_MM * PX_PER_MM;

/** Static front cover (`.report-pdf-cover-front`) — one sheet. */
export const REPORT_COVER_FRONT_PAGE_COUNT = 1;

/**
 * One intentionally blank sheet after the front cover (before INDEX).
 * Must match the number of `.report-blank-lead-page` nodes in `ZoneSummaryPdfView`.
 */
export const REPORT_LEAD_BLANK_PAGE_COUNT = 1;

/**
 * Chrome fits significantly more content in print than screen measurements suggest.
 * Use 1.10 multiplier to account for tighter line-spacing and font rendering in print.
 */
const EFFECTIVE_PAGE_HEIGHT_PX = REPORT_ZONE_PAGE_CONTENT_HEIGHT_PX * 1.1;

/** Default multiplier for zone table pagination (INDEX page ranges). */
export const REPORT_ZONE_SIM_PAGE_HEIGHT_MULT_DEFAULT = 1.1;

/**
 * Looser pagination (smaller effective height → more sheets) for trail-blank parity checks.
 * When the default sim stops one sheet short of print (e.g. 623 vs 624), pairing with 1.0 avoids a spurious extra blank.
 */
export const REPORT_ZONE_SIM_PAGE_HEIGHT_MULT_LOOSE = 1.0;

/**
 * Sheets consumed by lead blanks + INDEX + Final Summary (incl. zone master table)
 * before `.zone-pages-start`. Used for INDEX “Page No” zone ranges.
 */
export function measureFrontMatterPageCount(root: HTMLElement): number {
  let total = 0;
  if (root.querySelector(".report-pdf-cover-front")) {
    total += REPORT_COVER_FRONT_PAGE_COUNT;
  }
  total += root.querySelectorAll(".report-blank-lead-page").length;
  const indexEl = root.querySelector(".index-page");
  if (indexEl instanceof HTMLElement) {
    total += Math.max(
      1,
      Math.ceil(indexEl.getBoundingClientRect().height / EFFECTIVE_PAGE_HEIGHT_PX),
    );
  }
  const finalEl = root.querySelector(".final-summary-page");
  if (finalEl instanceof HTMLElement) {
    total += Math.max(
      1,
      Math.ceil(finalEl.getBoundingClientRect().height / EFFECTIVE_PAGE_HEIGHT_PX),
    );
  }
  return total;
}

/** Display page numbers for INDEX rows: absolute printed sheets (incl. lead blanks). */
export type IndexFrontMatterDisplayRanges = {
  finalSummaryCore: { pageFrom: number; pageTo: number };
  allZonesProperties: { pageFrom: number; pageTo: number } | null;
};

/**
 * Page ranges for INDEX rows under “Overall Summary” (Final Summary block vs consolidated table).
 */
export function measureIndexFrontMatterDisplayRanges(
  root: HTMLElement,
): IndexFrontMatterDisplayRanges {
  const core = root.querySelector(".lp-report-index-final-summary-core");
  const master = root.querySelector(".lp-report-index-zone-master-block");

  const corePages =
    core instanceof HTMLElement
      ? Math.max(
          1,
          Math.ceil(core.getBoundingClientRect().height / EFFECTIVE_PAGE_HEIGHT_PX),
        )
      : 1;

  const coverSheets = root.querySelector(".report-pdf-cover-front")
    ? REPORT_COVER_FRONT_PAGE_COUNT
    : 0;
  const leadSheets = root.querySelectorAll(".report-blank-lead-page").length;
  const indexEl = root.querySelector(".index-page");
  const indexSheets =
    indexEl instanceof HTMLElement
      ? Math.max(
          1,
          Math.ceil(indexEl.getBoundingClientRect().height / EFFECTIVE_PAGE_HEIGHT_PX),
        )
      : 0;

  let p = coverSheets + leadSheets + indexSheets;
  const finalSummaryCore = { pageFrom: p + 1, pageTo: p + corePages };
  p = finalSummaryCore.pageTo;

  let allZonesProperties: { pageFrom: number; pageTo: number } | null = null;
  if (master instanceof HTMLElement) {
    const mPages = Math.max(
      1,
      Math.ceil(master.getBoundingClientRect().height / EFFECTIVE_PAGE_HEIGHT_PX),
    );
    allZonesProperties = { pageFrom: p + 1, pageTo: p + mPages };
  }

  return { finalSummaryCore, allZonesProperties };
}

type Atom =
  | { kind: "standalone"; height: number }
  | { kind: "tableHead"; tableId: number; height: number }
  | { kind: "tableRow"; tableId: number; height: number };

type Block =
  | { kind: "standalone"; element: HTMLElement }
  | { kind: "table"; element: HTMLElement };

function gapAfter(current: HTMLElement, next?: HTMLElement): number {
  if (!next) return 0;
  const gap = next.getBoundingClientRect().top - current.getBoundingClientRect().bottom;
  return gap > 0 ? gap : 0;
}

function collectBlocks(sectionEl: HTMLElement): Block[] {
  const blocks: Block[] = [];

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

function collectAtoms(sectionEl: HTMLElement): Atom[] {
  const blocks = collectBlocks(sectionEl);
  const atoms: Atom[] = [];
  let nextTableId = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const nextBlock = blocks[i + 1];
    const trailingGap = gapAfter(block.element, nextBlock?.element);

    if (block.kind === "standalone") {
      atoms.push({
        kind: "standalone",
        height: block.element.getBoundingClientRect().height + trailingGap,
      });
      continue;
    }

    const tableId = nextTableId++;
    const thead = block.element.querySelector(":scope > thead");
    const rows = Array.from(block.element.querySelectorAll(":scope > tbody > tr")).filter(
      (row): row is HTMLElement => row instanceof HTMLElement,
    );

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
      const last = atoms[atoms.length - 1];
      last.height += trailingGap;
    }
  }

  return atoms;
}

function simulatePagesForSection(
  sectionEl: HTMLElement,
  effectivePageHeightPx: number,
): number {
  const atoms = collectAtoms(sectionEl);

  if (atoms.length === 0) {
    return Math.max(
      1,
      Math.ceil(sectionEl.getBoundingClientRect().height / effectivePageHeightPx),
    );
  }

  const repeatedHeadHeights = new Map<number, number>();
  for (const atom of atoms) {
    if (atom.kind === "tableHead") {
      repeatedHeadHeights.set(atom.tableId, atom.height);
    }
  }

  let pageCount = 1;
  let currentPageUsed = 0;
  let tablesOnCurrentPage = new Set<number>();
  const tablesStarted = new Set<number>();

  for (const atom of atoms) {
    const repeatedHeadHeight =
      atom.kind === "tableRow" &&
      tablesStarted.has(atom.tableId) &&
      !tablesOnCurrentPage.has(atom.tableId)
        ? repeatedHeadHeights.get(atom.tableId) ?? 0
        : 0;

    const requiredHeight = atom.height + repeatedHeadHeight;

    if (currentPageUsed > 0 && currentPageUsed + requiredHeight > effectivePageHeightPx) {
      pageCount += 1;
      currentPageUsed = 0;
      tablesOnCurrentPage = new Set<number>();
    }

    if (
      atom.kind === "tableRow" &&
      tablesStarted.has(atom.tableId) &&
      !tablesOnCurrentPage.has(atom.tableId)
    ) {
      currentPageUsed += repeatedHeadHeights.get(atom.tableId) ?? 0;
    }

    currentPageUsed += atom.height;

    if (atom.kind === "tableHead" || atom.kind === "tableRow") {
      tablesOnCurrentPage.add(atom.tableId);
      tablesStarted.add(atom.tableId);
    }
  }

  return Math.max(1, pageCount);
}

export type MeasureZoneIndexPageRangesOptions = {
  /** Multiplier on {@link REPORT_ZONE_PAGE_CONTENT_HEIGHT_PX}; default {@link REPORT_ZONE_SIM_PAGE_HEIGHT_MULT_DEFAULT}. */
  pageHeightMultiplier?: number;
};

function maxPageToFromRanges(
  ranges: Map<string, { pageFrom: number; pageTo: number }>,
): number {
  let maxTo = 0;
  for (const r of ranges.values()) maxTo = Math.max(maxTo, r.pageTo);
  return maxTo;
}

/**
 * Whether to insert a second trail blank before the back cover (last zone sheet odd).
 * Runs default (1.1×) and looser (1.0×) pagination sims; if they disagree on odd/even, the looser
 * result wins so we match print when Chrome uses one more sheet than the tight sim (e.g. footer 624 vs sim 623).
 */
export function shouldDoubleTrailBlankBeforeBackCover(
  zonePagesStart: HTMLElement,
  zoneIds: string[],
  pagesBeforeFirstZone: number,
): boolean | null {
  const tight = measureZoneIndexPageRanges(zonePagesStart, zoneIds, pagesBeforeFirstZone, {
    pageHeightMultiplier: REPORT_ZONE_SIM_PAGE_HEIGHT_MULT_DEFAULT,
  });
  const loose = measureZoneIndexPageRanges(zonePagesStart, zoneIds, pagesBeforeFirstZone, {
    pageHeightMultiplier: REPORT_ZONE_SIM_PAGE_HEIGHT_MULT_LOOSE,
  });
  if (!tight?.size || !loose?.size) return null;
  const maxT = maxPageToFromRanges(tight);
  const maxL = maxPageToFromRanges(loose);
  const tOdd = maxT % 2 === 1;
  const lOdd = maxL % 2 === 1;
  if (tOdd !== lOdd) return lOdd;
  return tOdd;
}

export function measureZoneIndexPageRanges(
  zonePagesStart: HTMLElement,
  zoneIds: string[],
  pagesBeforeFirstZone = 0,
  options?: MeasureZoneIndexPageRangesOptions,
): Map<string, { pageFrom: number; pageTo: number }> | null {
  const zoneSections = new Map<
    string,
    { dataPage: HTMLElement | null; summaryPage: HTMLElement | null }
  >();

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

  if (zoneSections.size === 0) return null;

  const mult = options?.pageHeightMultiplier ?? REPORT_ZONE_SIM_PAGE_HEIGHT_MULT_DEFAULT;
  const effectivePageHeightPx = REPORT_ZONE_PAGE_CONTENT_HEIGHT_PX * mult;

  const out = new Map<string, { pageFrom: number; pageTo: number }>();
  let currentPage = pagesBeforeFirstZone + 1;

  for (const zoneId of zoneIds) {
    const sections = zoneSections.get(zoneId);
    if (!sections) continue;

    const pageFrom = currentPage;

    let summaryPages = 1;
    if (sections.summaryPage) {
      summaryPages = simulatePagesForSection(sections.summaryPage, effectivePageHeightPx);
    }

    let dataPages = 0;
    if (sections.dataPage) {
      dataPages = simulatePagesForSection(sections.dataPage, effectivePageHeightPx);
    }

    const totalPages = summaryPages + dataPages;
    const pageTo = pageFrom + totalPages - 1;

    out.set(zoneId, { pageFrom, pageTo });
    currentPage = pageTo + 1;
  }

  return out.size > 0 ? out : null;
}
