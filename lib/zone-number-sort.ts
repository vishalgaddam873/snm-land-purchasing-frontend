/**
 * Same rules as backend `zone-number-sort.util.ts`: 1, 2, 2A, 3, 10, 15A …
 */

export function parseZoneNumberKey(s: string): {
  num: number;
  suffix: string;
} {
  const raw = String(s ?? "")
    .trim()
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!raw) {
    return { num: Number.MAX_SAFE_INTEGER - 1, suffix: "" };
  }

  const m = raw.match(/^(\d+)(?:[^0-9A-Za-z]*([A-Za-z]+))?$/);
  if (m) {
    return {
      num: parseInt(m[1], 10),
      suffix: (m[2] ?? "").toLowerCase(),
    };
  }

  const lead = raw.match(/^(\d+)/);
  if (lead) {
    const num = parseInt(lead[1], 10);
    const tail = raw.slice(lead[1].length);
    const letters = tail.match(/[A-Za-z]+/);
    return { num, suffix: letters ? letters[0].toLowerCase() : "" };
  }

  return { num: Number.MAX_SAFE_INTEGER, suffix: raw.toLowerCase() };
}

export function compareZoneNumbers(a: string, b: string): number {
  const pa = parseZoneNumberKey(a);
  const pb = parseZoneNumberKey(b);
  if (pa.num !== pb.num) return pa.num - pb.num;
  if (pa.suffix === pb.suffix) return 0;
  if (pa.suffix === "") return -1;
  if (pb.suffix === "") return 1;
  return pa.suffix.localeCompare(pb.suffix, undefined, { sensitivity: "base" });
}
