export type PropertyTableRowHighlight =
  | "tbr"
  | "adjoining"
  | "additional"
  | "vacant";

export type PropertyTableRow = {
  sno: number;
  zoneNumber: string;
  zoneName: string;
  sectorNumber: string;
  branchName: string;
  propertyName: string;
  areaHeld: string;
  constructionStatus: string;
  locatedAt: string;
  bhawanType: string;
  remarks: string;
  rowHighlight?: PropertyTableRowHighlight;
};

export type PropertyDetailRow = {
  branchName: string;
  propertyName: string;
  areaHeld: string;
  locatedAt: string;
  bhawanType: string;
  remarks: string;
  vacantPlotStatus: string | null;
};

export type ZoneSummaryWithDetails = {
  zoneId: string;
  zoneNumber: string;
  zoneName: string;
  departmentId: string;
  departmentName: string;
  /** e.g. DEP-001 — INDEX “Concerned PP” maps to PP 1, etc. */
  departmentCode: string;
  sectionA: {
    registeredBranches: number;
    branchesToBeRegistered: number;
    adjoiningPlots: number;
    additionalUnits: number;
    total: number;
  };
  sectionB: {
    bhawans: number;
    buildingsOtherThanBhawan: number;
    bhawansUnderConstruction: number;
    vacantPlots: number;
    vacantPlotsFitForConstruction: number;
    vacantPlotsFitForConstructionLaterStage: number;
    vacantPlotsSelfMadeShed: number;
    noBhawanNoPlots: number;
    notFitForConstruction: number;
    total: number;
  };
  allProperties: PropertyTableRow[];
  additionalUnitsDetails: PropertyDetailRow[];
  branchesToBeRegisteredDetails: PropertyDetailRow[];
  vacantPlotsDetails: PropertyDetailRow[];
  noBhawanNoPlotsDetails: PropertyDetailRow[];
  notFitForConstructionDetails: PropertyDetailRow[];
};

export type DepartmentOverallSummary = {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  sectionA: {
    registeredBranches: number;
    branchesToBeRegistered: number;
    adjoiningPlots: number;
    additionalUnits: number;
    total: number;
  };
  sectionB: {
    bhawans: number;
    buildingsOtherThanBhawan: number;
    bhawansUnderConstruction: number;
    vacantPlots: number;
    vacantPlotsFitForConstruction: number;
    vacantPlotsFitForConstructionLaterStage: number;
    vacantPlotsSelfMadeShed: number;
    noBhawanNoPlots: number;
    notFitForConstruction: number;
    total: number;
  };
  propertyUtilization: {
    totalPlots: number;
    bhawans: number;
    bhawansUnderConstruction: number;
    buildings: number;
    sheds: number;
    selfMadeSheds: number;
    vacant: number;
  };
};

export type ZoneIndexEntry = {
  sno: number;
  zoneNumber: string;
  zoneName: string;
  /** Optional from API; Summary Report UI fills these client-side for INDEX / PDF. */
  pageFrom?: number;
  pageTo?: number;
};

export type FullReportData = {
  index: ZoneIndexEntry[];
  overallSummary: DepartmentOverallSummary;
  zoneSummaries: ZoneSummaryWithDetails[];
};

export type DepartmentOption = {
  _id: string;
  name: string;
  code: string;
};

export type ZoneOption = {
  _id: string;
  name: string;
  zoneNumber: string;
  departmentId: string;
};

/** Maps department code (e.g. DEP-001, DEP-002) to INDEX “Concerned PP” (PP 1, PP 2, …). */
export function concernedPpFromDepartmentCode(
  code: string | undefined | null,
): string {
  const c = String(code ?? "").trim().toUpperCase();
  if (!c) return "—";
  const hyphen = c.match(/^DEP-0*(\d+)$/);
  if (hyphen) return `PP ${parseInt(hyphen[1], 10)}`;
  const compact = c.match(/^DEP0*(\d+)$/);
  if (compact) return `PP ${parseInt(compact[1], 10)}`;
  const tail = c.match(/(\d+)\s*$/);
  if (tail) return `PP ${parseInt(tail[1], 10)}`;
  return "—";
}

export function bhawanTypeLabel(v: string): string {
  const map: Record<string, string> = {
    bhawan: "Bhawan",
    bhawan_under_construction: "Bhawan (Under Construction)",
    shed: "Shed",
    self_made_shed: "Self made Shed",
    building: "Building",
    no_bhavan_no_plot: "NA",
    vacant_plot: "NA",
    na: "NA",
  };
  return map[v] ?? v;
}

export function vacantPlotStatusLabel(v: string | null): string {
  if (!v) return "";
  const map: Record<string, string> = {
    fit_for_construction: "Fit for construction",
    fit_for_construction_later_stage: "Fit for construction at later stage",
    not_fit_for_construction: "Not fit for construction",
  };
  return map[v] ?? v;
}
