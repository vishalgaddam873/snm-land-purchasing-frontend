"use client";

import { BranchSearchableSelect } from "@/components/properties/branch-searchable-select";
import {
  fetchActiveZonesForSelect,
  fetchBranchesForSelect,
  sortBranchesForSelect,
  branchOptionId,
  type BranchOption,
} from "@/components/properties/property-helpers";
import {
  ZoneSearchableSelect,
  type ZoneSelectOption,
} from "@/components/branches/zone-searchable-select";
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

type AnalyticsScope = "overall" | "zone" | "branch";

type PropertyAnalyticsResponse = {
  scope: AnalyticsScope;
  zoneId?: string;
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
    buildingsOtherThanBhawan: number;
    vacantPlots: number;
    noBhawanNoPlots: number;
    total: number;
  };
};

const A_COLORS = ["#059669", "#d97706", "#0284c7", "#7c3aed"];
const B_COLORS = ["#2563eb", "#64748b", "#16a34a", "#ea580c"];

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
  const [branchId, setBranchId] = React.useState("");

  const [zones, setZones] = React.useState<ZoneSelectOption[]>([]);
  const [branches, setBranches] = React.useState<BranchOption[]>([]);
  const [zonesLoading, setZonesLoading] = React.useState(true);
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

  const zoneTriggerLabel = React.useMemo(() => {
    if (!zoneId) return "Select zone";
    if (zonesLoading) return "Loading…";
    const z = sortedZones.find((x) => x._id === zoneId);
    return z ? `${z.name} (${z.zoneNumber})` : "Unknown zone";
  }, [zoneId, sortedZones, zonesLoading]);

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
  }, [scope, zoneId, branchId]);

  const summaryLine =
    scope === "overall"
      ? "Organization-wide property register (excludes deleted records)."
      : scope === "zone"
        ? "Scoped to branches in the selected zone."
        : "Scoped to the selected branch only.";

  const scopeBadge =
    scope === "overall"
      ? "Overall"
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
    return [
      {
        name: "Bhawan & shed",
        value: data.sectionB.bhawans,
        fill: B_COLORS[0],
      },
      {
        name: "Building (type)",
        value: data.sectionB.buildingsOtherThanBhawan,
        fill: B_COLORS[1],
      },
      {
        name: "Vacant plots",
        value: data.sectionB.vacantPlots,
        fill: B_COLORS[2],
      },
      {
        name: "No bhawan / no plot",
        value: data.sectionB.noBhawanNoPlots,
        fill: B_COLORS[3],
      },
    ].filter((d) => d.value > 0);
  }, [data]);

  const barB = React.useMemo(() => {
    if (!data) return [];
    return [
      { name: "Bhawan & shed", value: data.sectionB.bhawans },
      { name: "Building (type)", value: data.sectionB.buildingsOtherThanBhawan },
      { name: "Vacant plots", value: data.sectionB.vacantPlots },
      { name: "No bhawan / no plot", value: data.sectionB.noBhawanNoPlots },
    ];
  }, [data]);

  const showContent =
    data &&
    !(
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

          {(scope === "zone" && !zoneId) || (scope === "branch" && !branchId) ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 px-6 py-12 text-center">
              <MapPin className="mx-auto size-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium text-foreground">
                {scope === "zone"
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
                  value={data.sectionB.bhawans}
                  hint="Bhawan, bhawan under construction + shed"
                  icon={Building2}
                  accent="from-blue-500/20 to-transparent"
                />
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
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

                <ChartCard
                  title="Structure / land type"
                  subtitle="Bhawan vs building-type / plots (B1–B4)"
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
                      totalLabel="Total (A1–A4)"
                      totalValue={data.sectionA.total}
                    />
                    <AnalyticsTable
                      title="Structure / land type"
                      rows={[
                        {
                          code: "B1",
                          label:
                            "Total No. of Bhawans (Bhawan + under construction + shed)",
                          value: data.sectionB.bhawans,
                        },
                        {
                          code: "B2",
                          label: "Total No. of Buildings other than Bhawan",
                          value: data.sectionB.buildingsOtherThanBhawan,
                        },
                        {
                          code: "B3",
                          label: "No. of Vacant Plots",
                          value: data.sectionB.vacantPlots,
                        },
                        {
                          code: "B4",
                          label: "No Bhawan No Plots",
                          value: data.sectionB.noBhawanNoPlots,
                        },
                      ]}
                      totalLabel="Total (B1–B4)"
                      totalValue={data.sectionB.total}
                    />
                  </div>
                </div>
              </section>

              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                Registered / to-register rows count main branch sites only;
                adjoining and additional rows are separate units. B1 is the count of
                bhawan types “bhawan”, “bhawan_under_construction”, and “shed”. B2
                counts bhawan type “building” only (self-made shed and NA are not in
                B1 or B2).
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

function AnalyticsTable({
  title,
  rows,
  totalLabel,
  totalValue,
}: {
  title: string;
  rows: { code: string; label: string; value: number }[];
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
            <tr
              key={r.code}
              className="border-b border-border/50 last:border-b-0"
            >
              <td className="w-9 py-1.5 pr-2 font-medium text-muted-foreground">
                {r.code}
              </td>
              <td className="py-1.5 pr-3 text-foreground">{r.label}</td>
              <td className="py-1.5 text-right font-medium tabular-nums text-foreground">
                {r.value}
              </td>
            </tr>
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
