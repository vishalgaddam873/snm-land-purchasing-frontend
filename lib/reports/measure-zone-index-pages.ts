/**
 * Derives INDEX "Page No" From/To from the **on-screen** layout of zone blocks under
 * `.zone-pages-start`. Each block with `data-lp-zone-id` is stacked vertically; we map
 * Y-ranges to 1-based sheet indices using an A4 landscape content height (closer to
 * printed pagination than row-count heuristics alone).
 *
 * Print pagination can still differ slightly from preview; ResizeObserver re-runs when
 * the preview container size changes.
 */

/** Printable height (mm) for one landscape sheet after typical12mm top+bottom margin. */
const PRINTABLE_HEIGHT_MM = 210 - 24;

/** CSS px per mm at 96dpi (browser print preview baseline). */
const PX_PER_MM = 96 / 25.4;

export const REPORT_ZONE_PAGE_CONTENT_HEIGHT_PX = PRINTABLE_HEIGHT_MM * PX_PER_MM;

export function measureZoneIndexPageRanges(
  zonePagesStart: HTMLElement,
  zoneIds: string[],
): Map<string, { pageFrom: number; pageTo: number }> | null {
  const rootRect = zonePagesStart.getBoundingClientRect();
  const scrollTop = zonePagesStart.scrollTop;
  const bounds = new Map<string, { top: number; bottom: number }>();

  for (const child of Array.from(zonePagesStart.children)) {
    if (!(child instanceof HTMLElement)) continue;
    const id = child.dataset.lpZoneId;
    if (!id) continue;
    const cr = child.getBoundingClientRect();
    const top = cr.top - rootRect.top + scrollTop;
    const bottom = top + cr.height;
    const prev = bounds.get(id);
    if (!prev) bounds.set(id, { top, bottom });
    else {
      bounds.set(id, {
        top: Math.min(prev.top, top),
        bottom: Math.max(prev.bottom, bottom),
      });
    }
  }

  if (bounds.size === 0) return null;

  const H = REPORT_ZONE_PAGE_CONTENT_HEIGHT_PX;
  const out = new Map<string, { pageFrom: number; pageTo: number }>();

  for (const zid of zoneIds) {
    const b = bounds.get(zid);
    if (!b) continue;
    const pageFrom = Math.max(1, Math.floor(b.top / H) + 1);
    const pageTo = Math.max(pageFrom, Math.ceil(b.bottom / H));
    out.set(zid, { pageFrom, pageTo });
  }

  return out.size > 0 ? out : null;
}
