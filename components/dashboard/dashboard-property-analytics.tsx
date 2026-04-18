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
import { cn } from "@/lib/utils";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
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
    notFitForConstructionPlots: number;
    noBhawanNoPlots: number;
    total: number;
  };
};

const A_COLORS = ["#059669", "#d97706", "#0284c7", "#7c3aed"];
const B_COLORS = ["#2563eb", "#64748b", "#0d9488", "#16a34a", "#ea580c"];

function sortZonesForSelect(zones: ZoneSelectOption[]): ZoneSelectOption[] {
  return [...zones].sort((x, y) =>
    (x.zoneNumber ?? "").localeCompare(y.zoneNumber ?? "", undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

const selectTriggerClass =
  "h-10 w-full rounded-xl border-border/80 bg-background text-[13px] shadow-sm";

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

  const pieB = React.useMemo(() => {
    if (!data) return [];
    const b3 = data.sectionB.bhawansUnderConstruction ?? 0;
    return [
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
        name: "Vacant plots (B4)",
        value: data.sectionB.vacantPlots,
        fill: B_COLORS[3],
      },
      {
        name: "No bhawan / no plot (B5)",
        value: data.sectionB.noBhawanNoPlots,
        fill: B_COLORS[4],
      },
    ].filter((d) => d.value > 0);
  }, [data]);

  const barB = React.useMemo(() => {
    if (!data) return [];
    const b3 = data.sectionB.bhawansUnderConstruction ?? 0;
    return [
      { name: "Bhawan + shed (B1)", value: data.sectionB.bhawans },
      { name: "Building (B2)", value: data.sectionB.buildingsOtherThanBhawan },
      { name: "Under construction (B3)", value: b3 },
      { name: "Vacant plots (B4)", value: data.sectionB.vacantPlots },
      { name: "No bhawan / no plot (B5)", value: data.sectionB.noBhawanNoPlots },
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
                          <Cell key={i} fill={B_COLORS[i % B_COLORS.length]} />
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
                >
                  {pieB.length === 0 ? (
                    <EmptyChart label="No structure data in this scope" />
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieB}
                          cx="50%"
                          cy="50%"
                          innerRadius={68}
                          outerRadius={96}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                          strokeWidth={2}
                          stroke="var(--card)"
                        >
                          {pieB.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "1px solid var(--border)",
                            background: "var(--card)",
                          }}
                          formatter={(v: number) => [v, "Count"]}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          formatter={(value) => (
                            <span className="text-xs text-foreground">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard
                  title="Registration & units"
                  subtitle="Distribution by record type (A1–A4)"
                >
                  {pieA.length === 0 ? (
                    <EmptyChart label="No data in this scope" />
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieA}
                          cx="50%"
                          cy="50%"
                          innerRadius={68}
                          outerRadius={96}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                          strokeWidth={2}
                          stroke="var(--card)"
                        >
                          {pieA.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "1px solid var(--border)",
                            background: "var(--card)",
                          }}
                          formatter={(v: number) => [v, "Count"]}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          formatter={(value) => (
                            <span className="text-xs text-foreground">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </section>

              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                Registered / to-register rows count main branch sites only;
                adjoining and additional rows are separate units. B1 is completed
                bhawan plus shed; B3 is bhawan under construction only. B2 counts
                bhawan type “building” only (self-made shed and NA are not in B1–B3).
                B4 lists vacant plots plus self made sheds that have a vacant plot
                status; indented rows are fit vs not fit for construction. The
                bottom total is B1,B2,B3, B4 & B5 (no overlap).
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
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mb-2 text-xs text-muted-foreground">{subtitle}</p>
      <div className="min-h-[280px] w-full">{children}</div>
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
  const notFit = data.sectionB.notFitForConstructionPlots;
  const vacantTotal = data.sectionB.vacantPlots;
  const subRows: { label: string; value: number }[] = [
    { label: "Fit for construction", value: fit },
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
      label: "No. of Vacant Plots",
      value: vacantTotal,
      subRows,
    },
    {
      code: "B5",
      label: "No Bhawan No Plots",
      value: data.sectionB.noBhawanNoPlots,
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
