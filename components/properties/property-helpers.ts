export type ZoneMini = { _id: string; name: string; zoneNumber: string };

export type PopulatedBranch = {
  _id: string;
  name: string;
  zoneId?: ZoneMini | string;
};

export type BranchOption = {
  _id: string;
  name: string;
  status?: string;
};

export type PropertyRow = {
  _id: string;
  propertyName: string;
  branchId: PopulatedBranch | string;
  /** main_branch | additional_unit | adjoining_plot */
  propertyType?: string;
  areaHeld: string;
  constructionStatus: string;
  locatedAt: string;
  bhawanType: string;
  remarks: string;
  status: "active" | "inactive" | "deleted";
  registrationType: string;
  verificationStatus: string;
  verifiedAt: string | null;
  verifiedBy:
    | { _id: string; name: string; email?: string }
    | string
    | null
    | undefined;
  internalNotes: string;
};

export const FILTER_ALL_BRANCHES = "__all_branches__";

/** Sentinel for "no enum filter" on the properties list (branch uses FILTER_ALL_BRANCHES). */
export const PROPERTY_ENUM_FILTER_ALL = "__property_enum_all__";

export function bhawanLabel(v: string): string {
  const m: Record<string, string> = {
    bhawan: "Bhawan",
    shed: "Shed",
    self_made_shed: "Self made shed",
    building: "Building",
    no_bhavan_no_plot: "No bhavan, no plot",
    vacant_plot: "Vacant plot",
    na: "NA",
  };
  return m[v] ?? v;
}

export function constructionLabel(v: string): string {
  const m: Record<string, string> = {
    not_constructed: "Not constructed",
    under_construction: "Under construction",
    constructed: "Constructed",
  };
  return m[v] ?? v;
}

export function registrationLabel(v: string): string {
  const m: Record<string, string> = {
    registered: "Registered",
    to_be_registered: "To be registered",
  };
  return m[v] ?? v;
}

export function propertyTypeLabel(
  v: string | undefined | null,
): string {
  const key = v?.trim() || "main_branch";
  const m: Record<string, string> = {
    main_branch: "Main branch",
    additional_unit: "Additional unit",
    adjoining_plot: "Adjoining plot",
  };
  return m[key] ?? labelFromSnake(key);
}

export function verifiedByLabel(p: PropertyRow): string {
  const vb = p.verifiedBy;
  if (vb && typeof vb === "object" && "name" in vb) {
    return vb.name;
  }
  return "—";
}

export function resolvedZone(p: PropertyRow): ZoneMini | null {
  const b = p.branchId;
  if (b && typeof b === "object" && "zoneId" in b) {
    const z = b.zoneId;
    if (
      z &&
      typeof z === "object" &&
      "name" in z &&
      "zoneNumber" in z
    ) {
      return z as ZoneMini;
    }
  }
  return null;
}

export function zoneNumberLabel(p: PropertyRow): string {
  const z = resolvedZone(p);
  return z?.zoneNumber != null && z.zoneNumber !== "" ? z.zoneNumber : "—";
}

export function zoneNameLabel(p: PropertyRow): string {
  const z = resolvedZone(p);
  return z?.name != null && z.name !== "" ? z.name : "—";
}

export function branchNameOnly(p: PropertyRow): string {
  const b = p.branchId;
  if (b && typeof b === "object" && "name" in b) {
    return b.name;
  }
  return "—";
}

export function branchIdValue(p: PropertyRow): string {
  const b = p.branchId;
  if (b && typeof b === "object" && "_id" in b) {
    return String(b._id);
  }
  return String(b ?? "");
}

export function branchOptionId(b: BranchOption): string {
  return b._id != null && b._id !== "" ? String(b._id) : "";
}

export function sortBranchesForSelect(list: BranchOption[]): BranchOption[] {
  return [...list].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

export async function fetchBranchesForSelect(): Promise<BranchOption[]> {
  const qs = new URLSearchParams({ page: "1", limit: "100" });
  const res = await fetch(`/api/branches?${qs}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  if (!data?.data || !Array.isArray(data.data)) return [];
  return (data.data as BranchOption[]).filter(
    (b) => b.status !== "deleted",
  );
}

export function labelFromSnake(s: string): string {
  if (!s?.trim()) return "—";
  return s
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Single-line preview for data grids (strips HTML tags). */
export function remarksPlainPreview(raw: string | undefined): string {
  if (!raw?.trim()) return "—";
  if (!raw.includes("<")) {
    return raw.replace(/\r?\n/g, " ").trim();
  }
  const text = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text || "—";
}
