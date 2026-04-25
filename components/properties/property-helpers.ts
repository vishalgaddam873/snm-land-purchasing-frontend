import type { DepartmentSelectOption } from "@/components/branches/department-searchable-select";
import type { ZoneSelectOption } from "@/components/branches/zone-searchable-select";
import { isPaginatedList } from "@/lib/api/paginated-list";

export type ZoneMini = { _id: string; name: string; zoneNumber: string };

export type SectorMini = { _id: string; name: string; sectorNumber?: string };

export type PopulatedBranch = {
  _id: string;
  name: string;
  zoneId?: ZoneMini | string;
  sectorId?: SectorMini | string | null;
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
  /** When bhawanType is vacant_plot or self_made_shed */
  vacantPlotStatus?: string | null;
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

export function bhawanTypeAllowsVacantPlotStatus(bhawanType: string): boolean {
  return bhawanType === "vacant_plot" || bhawanType === "self_made_shed";
}

export function vacantPlotStatusLabel(
  bhawanType: string,
  status: string | null | undefined,
): string {
  if (!bhawanTypeAllowsVacantPlotStatus(bhawanType)) return "—";
  if (status == null || !String(status).trim()) return "—";
  const m: Record<string, string> = {
    fit_for_construction: "Fit for Construction",
    fit_for_construction_later_stage: "Fit for Construction at Later Stage",
    not_fit_for_construction: "Not Fit for Construction",
  };
  return m[status] ?? status;
}

export function bhawanLabel(v: string): string {
  const m: Record<string, string> = {
    bhawan: "Bhawan",
    bhawan_under_construction: "Bhawan under construction",
    shed: "Shed",
    self_made_shed: "Self Made Shed",
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
    building: "Building",
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

export function sectorNameLabel(p: PropertyRow): string {
  const b = p.branchId;
  if (!b || typeof b !== "object" || !("sectorId" in b)) return "—";
  const s = b.sectorId;
  if (s && typeof s === "object" && "name" in s && s.name?.trim()) {
    const num =
      "sectorNumber" in s &&
      typeof (s as { sectorNumber?: string }).sectorNumber === "string"
        ? (s as { sectorNumber: string }).sectorNumber.trim()
        : "";
    return num ? `${s.name} (${num})` : s.name;
  }
  return "—";
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

export async function fetchActiveZonesForSelect(): Promise<ZoneSelectOption[]> {
  const res = await fetch("/api/properties/zones-for-select", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => []);
  if (!Array.isArray(data)) return [];
  return data as ZoneSelectOption[];
}

export async function fetchBranchesForSelect(): Promise<BranchOption[]> {
  const res = await fetch("/api/properties/branches-for-select", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => []);
  if (!Array.isArray(data)) return [];
  return (data as BranchOption[]).filter((b) => b.status !== "deleted");
}

const DEPARTMENT_SELECT_PAGE_LIMIT = 100;

type DeptListRow = {
  _id: string;
  name: string;
  code: string;
  status: string;
};

export async function fetchDepartmentsForSelect(): Promise<
  DepartmentSelectOption[]
> {
  const res = await fetch(`/api/properties/departments-for-select`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(data)) {
    return [];
  }
  return (data as DeptListRow[])
    .filter((d) => d.status !== "deleted")
    .map((d) => ({ _id: d._id, name: d.name, code: d.code }));
}

export function sortDepartmentsForSelect(
  list: DepartmentSelectOption[],
): DepartmentSelectOption[] {
  return [...list].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
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
