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
    vacantPlots: number;
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
    vacantPlots: number;
    noBhawanNoPlots: number;
    notFitForConstruction: number;
    total: number;
  };
  propertyUtilization: {
    totalPlots: number;
    bhawans: number;
    buildings: number;
    sheds: number;
    vacant: number;
  };
};

export type ZoneIndexEntry = {
  sno: number;
  zoneNumber: string;
  zoneName: string;
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
    not_fit_for_construction: "Not fit for construction",
  };
  return map[v] ?? v;
}
