"use client";

import { BranchSearchableSelect } from "@/components/properties/branch-searchable-select";
import {
  DepartmentSearchableSelect,
  type DepartmentSelectOption,
} from "@/components/branches/department-searchable-select";
import {
  ZoneSearchableSelect,
  type ZoneSelectOption,
} from "@/components/branches/zone-searchable-select";
import {
  fetchActiveZonesForSelect,
  fetchBranchesForSelect,
  fetchDepartmentsForSelect,
  sortBranchesForSelect,
  sortDepartmentsForSelect,
  branchOptionId,
  type BranchOption,
} from "@/components/properties/property-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { compareZoneNumbers } from "@/lib/zone-number-sort";
import { cn } from "@/lib/utils";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Building2,
  FileWarning,
  Home,
  Layers,
  MapPin,
} from "lucide-react";
import * as React from "react";

type AnalyticsScope = "overall" | "zone" | "department" | "branch";

type PropertyAnalyticsResponse = {
  scope: AnalyticsScope;
  zoneId?: string;
  departmentId?: string;
  branchId?: string;
  totalProperties: number;
  sectionA: {
    registeredBranches: number;
    branchesToBeRegistered: number;
    adjoiningPlots: number;
    additionalUnits: number;
    total: number;
  };
  sectionB: {
    bhawans: number;
    /** B3 line (under construction); disjoint from B1. Omit on older API → 0. */
    bhawansUnderConstruction?: number;
    buildingsOtherThanBhawan: number;
    vacantPlots: number;
    /** Present from API v2; older responses omit and UI treats as 0. */
    vacantPlotsFitForConstruction?: number;
    vacantPlotsFitForConstructionLaterStage?: number;
    notFitForConstructionPlots: number;
    noBhawanNoPlots: number;
    total: number;
  };
};

const A_COLORS = ["#059669", "#d97706", "#0284c7", "#7c3aed"];
/** B1–B3 & B4 fills on the structure donut (B5 vacant uses `B5_VACANT_GREENS`). */
const B_COLORS = ["#2563eb", "#64748b", "#0d9488", "#ea580c"];
/** B1–B5 horizontal bar chart (single green for total B5 vacant). */
const B_BAR_COLORS = [
  "#2563eb",
  "#64748b",
  "#0d9488",
  "#ea580c",
  "#16a34a",
];
/** B5 vacant sub-slices (three greens). */
const B5_VACANT_GREENS = {
  fit: "#15803d",
  fitLater: "#22c55e",
  notFit: "#86efac",
} as const;

type StructurePieSlice = {
  name: string;
  value: number;
  fill: string;
  /** Vacant sub-slices (B5) — styled as a group in the legend. */
  isVacantSubslice?: boolean;
};

/** WCAG-ish relative luminance → pick readable label color on slice fills. */
function contrastLabelFill(segmentFill: string): string {
  const h = segmentFill.trim().replace("#", "");
  if (h.length !== 6 || !/^[0-9a-fA-F]+$/.test(h)) return "#f8fafc";
  const r = Number.parseInt(h.slice(0, 2), 16) / 255;
  const g = Number.parseInt(h.slice(2, 4), 16) / 255;
  const b = Number.parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.45 ? "#0f172a" : "#f8fafc";
}

function formatDonutSharePct(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

function DonutLegendRowCard({
  item,
  sum,
}: {
  item: StructurePieSlice;
  sum: number;
}) {
  const pct = sum > 0 ? (item.value / sum) * 100 : 0;
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border px-3 py-2.5 shadow-sm",
        item.isVacantSubslice
          ? "border-emerald-500/15 bg-emerald-500/[0.04]"
          : "border-border/70 bg-muted/20",
      )}
    >
      <span
        className="mt-0.5 h-9 w-1.5 shrink-0 rounded-full ring-1 ring-black/[0.06] dark:ring-white/10"
        style={{ backgroundColor: item.fill }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium leading-snug text-foreground">
          {item.name}
        </p>
        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-[11px]">
          <span className="tabular-nums text-muted-foreground">
            {item.value.toLocaleString()}{" "}
            <span className="font-normal">total count</span>
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
            {formatDonutSharePct(pct)}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Percent on the ring only — names live in the legend to avoid hole clutter. */
function structureSharePieLabel(props: unknown) {
  const p = props as {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
    payload?: StructurePieSlice;
  };
  const cx = p.cx ?? 0;
  const cy = p.cy ?? 0;
  const midAngle = p.midAngle ?? 0;
  const inner = p.innerRadius ?? 0;
  const outer = p.outerRadius ?? 0;
  const pctRaw = typeof p.percent === "number" ? p.percent * 100 : 0;
  const fill = p.payload?.fill ?? "#334155";
  const isVacantBreakdown = p.payload?.isVacantSubslice === true;
  const RADIAN = Math.PI / 180;
  const cos = Math.cos(-midAngle * RADIAN);
  const sin = Math.sin(-midAngle * RADIAN);

  const arcMidR = inner + (outer - inner) * 0.55;
  const ax = cx + arcMidR * cos;
  const ay = cy + arcMidR * sin;

  const showLabel = isVacantBreakdown ? pctRaw > 0 : pctRaw >= 3;
  if (!showLabel) return null;

  const fontSize =
    isVacantBreakdown && pctRaw < 2 ? 12.75 : pctRaw < 6 ? 15 : 16.5;

  return (
    <text
      x={ax}
      y={ay}
      fill={contrastLabelFill(fill)}
      textAnchor="middle"
      dominantBaseline="central"
      className="select-none"
      style={{
        fontSize,
        fontWeight: 700,
      }}
    >
      {formatDonutSharePct(pctRaw)}
    </text>
  );
}

/** A1–A4 donut: same ring labels as structure non-B5 slices (hide under 3%). */
function registrationSharePieLabel(props: unknown) {
  const p = props as {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
    payload?: StructurePieSlice;
  };
  const cx = p.cx ?? 0;
  const cy = p.cy ?? 0;
  const midAngle = p.midAngle ?? 0;
  const inner = p.innerRadius ?? 0;
  const outer = p.outerRadius ?? 0;
  const pctRaw = typeof p.percent === "number" ? p.percent * 100 : 0;
  const fill = p.payload?.fill ?? "#334155";
  const RADIAN = Math.PI / 180;
  const cos = Math.cos(-midAngle * RADIAN);
  const sin = Math.sin(-midAngle * RADIAN);

  const arcMidR = inner + (outer - inner) * 0.55;
  const ax = cx + arcMidR * cos;
  const ay = cy + arcMidR * sin;

  if (pctRaw < 3) return null;

  const fontSize = pctRaw < 6 ? 15 : 16.5;

  return (
    <text
      x={ax}
      y={ay}
      fill={contrastLabelFill(fill)}
      textAnchor="middle"
      dominantBaseline="central"
      className="select-none"
      style={{
        fontSize,
        fontWeight: 700,
      }}
    >
      {formatDonutSharePct(pctRaw)}
    </text>
  );
}

function RegistrationUnitsLegendGrid({
  items,
  sum,
}: {
  items: StructurePieSlice[];
  sum: number;
}) {
  return (
    <div className="space-y-4 border-t border-border/60 pt-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Categories
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {items.map((item) => (
          <DonutLegendRowCard key={item.name} item={item} sum={sum} />
        ))}
      </div>
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Hover the chart for counts. Slices under 3% omit the on-chart percentage.
      </p>
    </div>
  );
}

function StructureShareLegendGrid({
  items,
  sum,
}: {
  items: StructurePieSlice[];
  sum: number;
}) {
  const isNoBhawanSlice = (x: StructurePieSlice) =>
    x.name.includes("No bhawan / no plot");
  const vacantSubslices = items.filter((x) => x.isVacantSubslice);
  const b123 = items.filter(
    (x) => !x.isVacantSubslice && !isNoBhawanSlice(x),
  );
  const noBhawanOnly = items.filter(
    (x) => !x.isVacantSubslice && isNoBhawanSlice(x),
  );

  return (
    <div className="space-y-4 border-t border-border/60 pt-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Categories
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {b123.map((item) => (
          <DonutLegendRowCard key={item.name} item={item} sum={sum} />
        ))}
        {noBhawanOnly.map((item) => (
          <DonutLegendRowCard key={item.name} item={item} sum={sum} />
        ))}
        {vacantSubslices.length > 0 ? (
          <div className="sm:col-span-2">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-700/90 dark:text-emerald-400/90">
              Vacant plots — breakdown (B5)
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {vacantSubslices.map((item) => (
                <DonutLegendRowCard key={item.name} item={item} sum={sum} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Hover the chart for counts. Non–B5 breakdown slices under 3% omit the
        on-chart percentage; B5 vacant slices always show a % when present.
      </p>
    </div>
  );
}

function zoneDeptId(z: ZoneSelectOption): string {
  return z.departmentId != null && z.departmentId !== ""
    ? String(z.departmentId)
    : "";
}

function sortZonesForSelect(zones: ZoneSelectOption[]): ZoneSelectOption[] {
  return [...zones].sort((x, y) => {
    const c = compareZoneNumbers(x.zoneNumber ?? "", y.zoneNumber ?? "");
    if (c !== 0) return c;
    return zoneDeptId(x).localeCompare(zoneDeptId(y));
  });
}

const selectTriggerClass =
  "h-10 w-full rounded-xl border-border/80 bg-background text-[13px] shadow-sm";

/** Pie / donut hover popup: count + share of the chart total (non-zero slices only). */
function PieDonutTooltipContent({
  active,
  payload,
  sumOfSliceValues,
}: {
  active?: boolean;
  payload?: unknown;
  sumOfSliceValues: number;
}) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;
  const row = payload[0] as Record<string, unknown>;
  const nested =
    row.payload && typeof row.payload === "object"
      ? (row.payload as Record<string, unknown>)
      : undefined;
  const count = Number(row.value ?? 0);
  let fromRecharts: number | null = null;
  if (typeof row.percent === "number" && Number.isFinite(row.percent)) {
    fromRecharts = row.percent * 100;
  } else if (
    typeof nested?.percent === "number" &&
    Number.isFinite(nested.percent)
  ) {
    fromRecharts = nested.percent * 100;
  }
  const pct =
    fromRecharts ??
    (sumOfSliceValues > 0 ? (count / sumOfSliceValues) * 100 : null);
  const rawName = row.name;
  const title =
    rawName != null && rawName !== "" ? String(rawName) : "Category";
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-md">
      <div className="font-semibold text-foreground">{title}</div>
      <div className="mt-1.5 space-y-0.5 text-muted-foreground">
        <div>
          Count:{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {count}
          </span>
        </div>
        {pct != null ? (
          <div>
            Percentage:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {pct.toFixed(1)}%
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DashboardPropertyAnalytics() {
  const [scope, setScope] = React.useState<AnalyticsScope>("overall");
  const [zoneId, setZoneId] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [branchId, setBranchId] = React.useState("");

  const [zones, setZones] = React.useState<ZoneSelectOption[]>([]);
  const [departments, setDepartments] = React.useState<DepartmentSelectOption[]>(
    [],
  );
  const [branches, setBranches] = React.useState<BranchOption[]>([]);
  const [zonesLoading, setZonesLoading] = React.useState(true);
  const [departmentsLoading, setDepartmentsLoading] = React.useState(true);
  const [branchesLoading, setBranchesLoading] = React.useState(true);

  const [data, setData] = React.useState<PropertyAnalyticsResponse | null>(
    null,
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const sortedZones = React.useMemo(
    () => sortZonesForSelect(zones),
    [zones],
  );
  const sortedBranches = React.useMemo(
    () => sortBranchesForSelect(branches),
    [branches],
  );
  const sortedDepartments = React.useMemo(
    () => sortDepartmentsForSelect(departments),
    [departments],
  );

  const zoneTriggerLabel = React.useMemo(() => {
    if (!zoneId) return "Select zone";
    if (zonesLoading) return "Loading…";
    const z = sortedZones.find((x) => x._id === zoneId);
    return z ? `${z.name} (${z.zoneNumber})` : "Unknown zone";
  }, [zoneId, sortedZones, zonesLoading]);

  const departmentTriggerLabel = React.useMemo(() => {
    if (!departmentId) return "Select department";
    if (departmentsLoading) return "Loading…";
    const d = sortedDepartments.find((x) => x._id === departmentId);
    return d ? `${d.name} (${d.code})` : "Unknown department";
  }, [departmentId, sortedDepartments, departmentsLoading]);

  const branchTriggerLabel = React.useMemo(() => {
    if (!branchId) return "Select branch";
    if (branchesLoading) return "Loading…";
    const b = sortedBranches.find((x) => branchOptionId(x) === branchId);
    return b?.name ?? "Unknown branch";
  }, [branchId, sortedBranches, branchesLoading]);

  React.useEffect(() => {
    void (async () => {
      setZonesLoading(true);
      try {
        setZones(await fetchActiveZonesForSelect());
      } finally {
        setZonesLoading(false);
      }
    })();
  }, []);

  React.useEffect(() => {
    void (async () => {
      setDepartmentsLoading(true);
      try {
        setDepartments(await fetchDepartmentsForSelect());
      } catch {
        setDepartments([]);
      } finally {
        setDepartmentsLoading(false);
      }
    })();
  }, []);

  React.useEffect(() => {
    void (async () => {
      setBranchesLoading(true);
      try {
        setBranches(await fetchBranchesForSelect());
      } catch {
        setBranches([]);
      } finally {
        setBranchesLoading(false);
      }
    })();
  }, []);

  React.useEffect(() => {
    if (scope === "department" && !departmentId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    if (scope === "zone" && !zoneId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    if (scope === "branch" && !branchId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const qs = new URLSearchParams({ scope });
    if (scope === "department" && departmentId)
      qs.set("departmentId", departmentId);
    if (scope === "zone" && zoneId) qs.set("zoneId", zoneId);
    if (scope === "branch" && branchId) qs.set("branchId", branchId);

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch(`/api/properties/analytics?${qs}`, {
          cache: "no-store",
        });
        const raw: unknown = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          let msg = "Could not load analytics";
          if (raw && typeof raw === "object" && "message" in raw) {
            const m = (raw as { message?: string | string[] }).message;
            msg = Array.isArray(m) ? m.join(", ") : (m ?? msg);
          }
          setError(msg);
          setData(null);
        } else {
          setData(raw as PropertyAnalyticsResponse);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load analytics");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scope, zoneId, departmentId, branchId]);

  const summaryLine =
    scope === "overall"
      ? "Organization-wide property register (excludes deleted records)."
      : scope === "department"
        ? "Scoped to branches in zones belonging to the selected department."
        : scope === "zone"
          ? "Scoped to branches in the selected zone."
          : "Scoped to the selected branch only.";

  const scopeBadge =
    scope === "overall"
      ? "Overall"
      : scope === "department"
        ? departmentTriggerLabel !== "Select department"
          ? departmentTriggerLabel
          : "Department"
        : scope === "zone"
          ? zoneTriggerLabel !== "Select zone"
            ? zoneTriggerLabel
            : "Zone"
          : branchTriggerLabel !== "Select branch"
            ? branchTriggerLabel
            : "Branch";

  const pieA = React.useMemo(() => {
    if (!data) return [];
    return [
      {
        name: "Registered (main)",
        value: data.sectionA.registeredBranches,
        fill: A_COLORS[0],
      },
      {
        name: "To register (main)",
        value: data.sectionA.branchesToBeRegistered,
        fill: A_COLORS[1],
      },
      {
        name: "Adjoining plots",
        value: data.sectionA.adjoiningPlots,
        fill: A_COLORS[2],
      },
      {
        name: "Additional units",
        value: data.sectionA.additionalUnits,
        fill: A_COLORS[3],
      },
    ].filter((d) => d.value > 0);
  }, [data]);

  const pieASum = React.useMemo(
    () => pieA.reduce((s, d) => s + d.value, 0),
    [pieA],
  );

  const pieB = React.useMemo(() => {
    if (!data) return [];
    const b3 = data.sectionB.bhawansUnderConstruction ?? 0;
    const b4Fit = data.sectionB.vacantPlotsFitForConstruction ?? 0;
    const b4Later = data.sectionB.vacantPlotsFitForConstructionLaterStage ?? 0;
    const b4NotFit = data.sectionB.notFitForConstructionPlots ?? 0;

    const slices: StructurePieSlice[] = [
      {
        name: "Bhawan + shed (B1)",
        value: data.sectionB.bhawans,
        fill: B_COLORS[0],
      },
      {
        name: "Building (B2)",
        value: data.sectionB.buildingsOtherThanBhawan,
        fill: B_COLORS[1],
      },
      {
        name: "Under construction (B3)",
        value: b3,
        fill: B_COLORS[2],
      },
      {
        name: "No bhawan / no plot (B4)",
        value: data.sectionB.noBhawanNoPlots,
        fill: B_COLORS[3],
      },
    ];
    if (b4Fit > 0) {
      slices.push({
        name: "Vacant — Fit for construction (B5)",
        value: b4Fit,
        fill: B5_VACANT_GREENS.fit,
        isVacantSubslice: true,
      });
    }
    if (b4Later > 0) {
      slices.push({
        name: "Vacant — Fit at later stage (B5)",
        value: b4Later,
        fill: B5_VACANT_GREENS.fitLater,
        isVacantSubslice: true,
      });
    }
    if (b4NotFit > 0) {
      slices.push({
        name: "Vacant — Not fit for construction (B5)",
        value: b4NotFit,
        fill: B5_VACANT_GREENS.notFit,
        isVacantSubslice: true,
      });
    }
    return slices.filter((d) => d.value > 0);
  }, [data]);

  const pieBSum = React.useMemo(
    () => pieB.reduce((s, d) => s + d.value, 0),
    [pieB],
  );

  const barB = React.useMemo(() => {
    if (!data) return [];
    const b3 = data.sectionB.bhawansUnderConstruction ?? 0;
    return [
      { name: "Bhawan + shed (B1)", value: data.sectionB.bhawans },
      { name: "Building (B2)", value: data.sectionB.buildingsOtherThanBhawan },
      { name: "Under construction (B3)", value: b3 },
      { name: "No bhawan / no plot (B4)", value: data.sectionB.noBhawanNoPlots },
      { name: "Vacant plots (B5)", value: data.sectionB.vacantPlots },
    ];
  }, [data]);

  const showContent =
    data &&
    !(
      (scope === "department" && !departmentId) ||
      (scope === "zone" && !zoneId) ||
      (scope === "branch" && !branchId)
    );

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-2xl border-border/80 bg-gradient-to-br from-card via-card to-primary/[0.04] shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <BarChart3 className="size-5" aria-hidden />
                </span>
                <div>
                  <CardTitle className="text-lg font-semibold tracking-tight">
                    Land &amp; branch analytics
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{summaryLine}</p>
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                Current view:{" "}
                <span className="rounded-md bg-background/80 px-2 py-0.5 text-foreground ring-1 ring-border/80">
                  {scopeBadge}
                </span>
              </p>
            </div>

            <Tabs
              value={scope}
              onValueChange={(v) => {
                setScope((v ?? "overall") as AnalyticsScope);
              }}
              className="w-full gap-3 lg:w-auto lg:min-w-[min(100%,24rem)]"
            >
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-background/80 p-1 shadow-sm ring-1 ring-border/60">
                <TabsTrigger
                  value="overall"
                  className="rounded-lg px-4 py-2 text-xs sm:text-sm"
                >
                  Overall
                </TabsTrigger>
                <TabsTrigger
                  value="department"
                  className="rounded-lg px-4 py-2 text-xs sm:text-sm"
                >
                  Department
                </TabsTrigger>
                <TabsTrigger
                  value="zone"
                  className="rounded-lg px-4 py-2 text-xs sm:text-sm"
                >
                  Zone
                </TabsTrigger>
                <TabsTrigger
                  value="branch"
                  className="rounded-lg px-4 py-2 text-xs sm:text-sm"
                >
                  Branch
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overall" className="mt-0" />

              <TabsContent value="department" className="mt-0 space-y-1.5">
                <Label
                  htmlFor="dash-analytics-department"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Department
                </Label>
                <DepartmentSearchableSelect
                  id="dash-analytics-department"
                  departments={sortedDepartments}
                  disabled={departmentsLoading}
                  value={departmentId}
                  onChange={setDepartmentId}
                  triggerLabel={departmentTriggerLabel}
                  showAllOption={false}
                  triggerClassName={selectTriggerClass}
                  menuZIndexClass="z-[400]"
                />
              </TabsContent>

              <TabsContent value="zone" className="mt-0 space-y-1.5">
                <Label
                  htmlFor="dash-analytics-zone"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Zone
                </Label>
                <ZoneSearchableSelect
                  id="dash-analytics-zone"
                  zones={sortedZones}
                  disabled={zonesLoading}
                  value={zoneId}
                  onChange={setZoneId}
                  triggerLabel={zoneTriggerLabel}
                  showAllOption={false}
                  triggerClassName={selectTriggerClass}
                  menuZIndexClass="z-[400]"
                />
              </TabsContent>

              <TabsContent value="branch" className="mt-0 space-y-1.5">
                <Label
                  htmlFor="dash-analytics-branch"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Branch
                </Label>
                <BranchSearchableSelect
                  id="dash-analytics-branch"
                  branches={sortedBranches}
                  disabled={branchesLoading}
                  value={branchId}
                  onChange={setBranchId}
                  triggerLabel={branchTriggerLabel}
                  showAllOption={false}
                  triggerClassName={selectTriggerClass}
                  menuZIndexClass="z-[400]"
                />
              </TabsContent>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {error ? (
            <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {(scope === "department" && !departmentId) ||
          (scope === "zone" && !zoneId) ||
          (scope === "branch" && !branchId) ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 px-6 py-12 text-center">
              <MapPin className="mx-auto size-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium text-foreground">
                {scope === "department"
                  ? "Select a department to load analytics"
                  : scope === "zone"
                    ? "Select a zone to load analytics"
                    : "Select a branch to load analytics"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                KPIs and charts update automatically once a scope is chosen.
              </p>
            </div>
          ) : loading ? (
            <KpiSkeletonGrid />
          ) : showContent && data ? (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  title="Total properties"
                  value={data.totalProperties}
                  hint="Active records in current scope"
                  icon={Layers}
                  accent="from-violet-500/20 to-transparent"
                />
                <KpiCard
                  title="Registered (main)"
                  value={data.sectionA.registeredBranches}
                  hint="Main branch sites — registered"
                  icon={Home}
                  accent="from-emerald-500/20 to-transparent"
                />
                <KpiCard
                  title="To be registered"
                  value={data.sectionA.branchesToBeRegistered}
                  hint="Main branch sites — pending"
                  icon={FileWarning}
                  accent="from-amber-500/20 to-transparent"
                />
                <KpiCard
                  title="Bhawans"
                  value={
                    data.sectionB.bhawans +
                    (data.sectionB.bhawansUnderConstruction ?? 0)
                  }
                  hint="B1 + B3: constructed bhawan + shed, plus under construction"
                  icon={Building2}
                  accent="from-blue-500/20 to-transparent"
                />
                <KpiCard
                  title="Not fit plots"
                  value={data.sectionB.notFitForConstructionPlots}
                  hint="Vacant plots & self made sheds (with status) marked not fit"
                  icon={FileWarning}
                  accent="from-rose-500/20 to-transparent"
                />
              </section>

              <section className="grid gap-4 lg:grid-cols-2 lg:items-start">
                <ChartCard
                  title="Structure / land type"
                  subtitle="B1–B5 structure lines (each category counted once)"
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={barB}
                      layout="vertical"
                      margin={{ left: 4, right: 16, top: 8, bottom: 8 }}
                    >
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={118}
                        tick={{ fill: "var(--foreground)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid var(--border)",
                          background: "var(--card)",
                        }}
                        formatter={(v: number) => [v, "Properties"]}
                      />
                      <Bar
                        dataKey="value"
                        radius={[0, 8, 8, 0]}
                        maxBarSize={28}
                      >
                        {barB.map((_, i) => (
                          <Cell
                            key={i}
                            fill={B_BAR_COLORS[i % B_BAR_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <div className="rounded-2xl border border-border/80 bg-card/50 p-5 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
                  <h3 className="text-sm font-semibold text-foreground">
                    Detailed breakdown
                  </h3>
                  <p className="mb-4 text-xs text-muted-foreground">
                    Full A/B register lines for audits and reconciliation.
                  </p>
                  <div className="space-y-6">
                    <AnalyticsTable
                      title="Registration & units"
                      rows={[
                        {
                          code: "A1",
                          label: "No. of Registered Branches",
                          value: data.sectionA.registeredBranches,
                        },
                        {
                          code: "A2",
                          label: "No. of Branches to be Registered",
                          value: data.sectionA.branchesToBeRegistered,
                        },
                        {
                          code: "A3",
                          label: "No. of Adjoining Plots",
                          value: data.sectionA.adjoiningPlots,
                        },
                        {
                          code: "A4",
                          label:
                            "No. of Additional Units (Branches having more than one Land + Bhawan)",
                          value: data.sectionA.additionalUnits,
                        },
                      ]}
                      totalLabel="Total (A1, A2, A3 & A4)"
                      totalValue={data.sectionA.total}
                    />
                    <AnalyticsTable
                      title="Structure / land type"
                      rows={structureLandTypeTableRows(data)}
                      totalLabel="Total (B1,B2,B3, B4 & B5)"
                      totalValue={data.sectionB.total}
                    />
                  </div>
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <ChartCard
                  title="Structure share"
                  subtitle="Donut view of land / building classification"
                  contentClassName="min-h-0"
                >
                  {pieB.length === 0 ? (
                    <EmptyChart label="No structure data in this scope" />
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="h-[378px] w-full shrink-0">
                        <ResponsiveContainer
                          width="100%"
                          height="100%"
                          className="[&_.recharts-surface]:outline-none"
                        >
                          <PieChart>
                            <Pie
                              data={pieB}
                              cx="50%"
                              cy="50%"
                              innerRadius={72}
                              outerRadius={153}
                              paddingAngle={2.25}
                              minAngle={1.8}
                              dataKey="value"
                              nameKey="name"
                              strokeWidth={3}
                              stroke="var(--card)"
                              label={structureSharePieLabel}
                              labelLine={false}
                            >
                              {pieB.map((entry) => (
                                <Cell key={entry.name} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip
                              content={(props) => (
                                <PieDonutTooltipContent
                                  active={props.active}
                                  payload={props.payload}
                                  sumOfSliceValues={pieBSum}
                                />
                              )}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <StructureShareLegendGrid items={pieB} sum={pieBSum} />
                    </div>
                  )}
                </ChartCard>

                <ChartCard
                  title="Registration & units"
                  subtitle="Distribution by record type (A1–A4)"
                  contentClassName="min-h-0"
                >
                  {pieA.length === 0 ? (
                    <EmptyChart label="No data in this scope" />
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="h-[378px] w-full shrink-0">
                        <ResponsiveContainer
                          width="100%"
                          height="100%"
                          className="[&_.recharts-surface]:outline-none"
                        >
                          <PieChart>
                            <Pie
                              data={pieA}
                              cx="50%"
                              cy="50%"
                              innerRadius={72}
                              outerRadius={153}
                              paddingAngle={2.25}
                              minAngle={1.8}
                              dataKey="value"
                              nameKey="name"
                              strokeWidth={3}
                              stroke="var(--card)"
                              label={registrationSharePieLabel}
                              labelLine={false}
                            >
                              {pieA.map((entry) => (
                                <Cell key={entry.name} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip
                              content={(props) => (
                                <PieDonutTooltipContent
                                  active={props.active}
                                  payload={props.payload}
                                  sumOfSliceValues={pieASum}
                                />
                              )}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <RegistrationUnitsLegendGrid
                        items={pieA}
                        sum={pieASum}
                      />
                    </div>
                  )}
                </ChartCard>
              </section>

              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                Registered / to-register rows count main branch sites only;
                adjoining and additional rows are separate units. B1 is completed
                bhawan plus shed; B3 is bhawan under construction only. B2 counts
                bhawan type “building” only (self-made shed and NA are not in B1–B3).
                B4 is no bhawan / no plot. B5 lists vacant plots plus self made sheds
                that have a vacant plot status; indented rows are fit vs not fit for
                construction. The bottom total is B1,B2,B3, B4 & B5 (no overlap).
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  title: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-2xl border-border/80 shadow-sm transition-shadow hover:shadow-md",
        "bg-gradient-to-br",
        accent,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/40 to-transparent dark:from-white/5" />
      <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
          {title}
        </CardTitle>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/15">
          <Icon className="size-4" aria-hidden />
        </span>
      </CardHeader>
      <CardContent className="relative space-y-1 pb-4">
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function KpiSkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-2xl bg-muted/50 ring-1 ring-border/40"
        />
      ))}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  contentClassName,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** Merged with default `min-h-[280px]`; pass `min-h-0` to size to content. */
  contentClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mb-2 text-xs text-muted-foreground">{subtitle}</p>
      <div className={cn("min-h-[280px] w-full", contentClassName)}>
        {children}
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-xl bg-muted/20 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

type AnalyticsTableRow = {
  code: string;
  label: string;
  value: number;
  subRows?: { label: string; value: number }[];
};

function structureLandTypeTableRows(
  data: PropertyAnalyticsResponse,
): AnalyticsTableRow[] {
  const fit = data.sectionB.vacantPlotsFitForConstruction ?? 0;
  const fitLater =
    data.sectionB.vacantPlotsFitForConstructionLaterStage ?? 0;
  const notFit = data.sectionB.notFitForConstructionPlots;
  const vacantTotal = data.sectionB.vacantPlots;
  const subRows: { label: string; value: number }[] = [
    { label: "Fit for construction", value: fit },
    {
      label: "Fit for construction at later stage",
      value: fitLater,
    },
    { label: "Not fit for construction", value: notFit },
  ];
  return [
    {
      code: "B1",
      label: "Total No. of Bhawans and Shed (excl. under construction)",
      value: data.sectionB.bhawans,
    },
    {
      code: "B2",
      label: "Total No. of Buildings other than Bhawan",
      value: data.sectionB.buildingsOtherThanBhawan,
    },
    {
      code: "B3",
      label: "No. of Bhawan Under Construction",
      value: data.sectionB.bhawansUnderConstruction ?? 0,
    },
    {
      code: "B4",
      label: "No Bhawan No Plots",
      value: data.sectionB.noBhawanNoPlots,
    },
    {
      code: "B5",
      label: "No. of Vacant Plots",
      value: vacantTotal,
      subRows,
    },
  ];
}

function AnalyticsTable({
  title,
  rows,
  totalLabel,
  totalValue,
}: {
  title: string;
  rows: AnalyticsTableRow[];
  totalLabel: string;
  totalValue: number;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <table className="w-full min-w-0 border-collapse text-xs sm:text-sm">
        <tbody>
          {rows.map((r) => (
            <React.Fragment key={r.code}>
              <tr className="border-b border-border/50">
                <td className="w-9 py-1.5 pr-2 font-medium text-muted-foreground">
                  {r.code}
                </td>
                <td className="py-1.5 pr-3 text-foreground">{r.label}</td>
                <td className="py-1.5 text-right font-medium tabular-nums text-foreground">
                  {r.value}
                </td>
              </tr>
              {r.subRows?.map((sr, i) => (
                <tr
                  key={`${r.code}-sub-${i}`}
                  className="border-b border-border/35 bg-muted/20"
                >
                  <td className="w-9 py-1 pr-2" />
                  <td className="py-1 pr-3 pl-4 text-muted-foreground">
                    {sr.label}
                  </td>
                  <td className="py-1 text-right tabular-nums text-muted-foreground">
                    {sr.value}
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
          <tr className="bg-muted/60">
            <td className="py-2 pr-2" />
            <td className="py-2 pr-3 font-semibold text-foreground">
              {totalLabel}
            </td>
            <td className="py-2 text-right text-sm font-semibold tabular-nums text-foreground">
              {totalValue}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
