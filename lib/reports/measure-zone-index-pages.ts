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

/** Printable height (mm) for one A4 landscape sheet after 12mm top+bottom margin */
const PRINTABLE_HEIGHT_MM = 210 - 24; // 186mm

/** CSS px per mm at 96dpi */
const PX_PER_MM = 96 / 25.4; // ~3.78

/** A4 landscape page content height in pixels */
export const REPORT_ZONE_PAGE_CONTENT_HEIGHT_PX = PRINTABLE_HEIGHT_MM * PX_PER_MM; // ~703px

/**
 * Chrome fits significantly more content in print than screen measurements suggest.
 * Use 1.10 multiplier to account for tighter line-spacing and font rendering in print.
 */
const EFFECTIVE_PAGE_HEIGHT_PX = REPORT_ZONE_PAGE_CONTENT_HEIGHT_PX * 1.10;

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

function simulatePagesForSection(sectionEl: HTMLElement): number {
  const atoms = collectAtoms(sectionEl);

  if (atoms.length === 0) {
    return Math.max(
      1,
      Math.ceil(sectionEl.getBoundingClientRect().height / EFFECTIVE_PAGE_HEIGHT_PX),
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

    if (currentPageUsed > 0 && currentPageUsed + requiredHeight > EFFECTIVE_PAGE_HEIGHT_PX) {
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

export function measureZoneIndexPageRanges(
  zonePagesStart: HTMLElement,
  zoneIds: string[],
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

  const out = new Map<string, { pageFrom: number; pageTo: number }>();
  let currentPage = 1;

  for (const zoneId of zoneIds) {
    const sections = zoneSections.get(zoneId);
    if (!sections) continue;

    const pageFrom = currentPage;

    let summaryPages = 1;
    if (sections.summaryPage) {
      summaryPages = simulatePagesForSection(sections.summaryPage);
    }

    let dataPages = 0;
    if (sections.dataPage) {
      dataPages = simulatePagesForSection(sections.dataPage);
    }

    const totalPages = summaryPages + dataPages;
    const pageTo = pageFrom + totalPages - 1;

    out.set(zoneId, { pageFrom, pageTo });
    currentPage = pageTo + 1;
  }

  return out.size > 0 ? out : null;
}
