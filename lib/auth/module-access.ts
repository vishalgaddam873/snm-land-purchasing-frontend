export const APP_MODULE_IDS = [
  "dashboard",
  "zones",
  "sectors",
  "branches",
  "properties",
  "reports",
  "departments",
  "users",
] as const;

export type AppModuleId = (typeof APP_MODULE_IDS)[number];

export type ModuleAccessLevel = "edit" | "view" | "none";

export type SessionUserLike = {
  role?: string;
  moduleAccess?: Record<string, string>;
} | null;

export function effectiveModuleLevel(
  user: SessionUserLike,
  moduleId: AppModuleId,
): ModuleAccessLevel {
  if (!user) return "edit";
  if (user.role === "superadmin") return "edit";
  const v = user.moduleAccess?.[moduleId];
  if (v === "none") return "none";
  if (v === "view") return "view";
  return "edit";
}

export function moduleAllowsEdit(
  user: SessionUserLike,
  moduleId: AppModuleId,
): boolean {
  return effectiveModuleLevel(user, moduleId) === "edit";
}

export function moduleAllowsView(
  user: SessionUserLike,
  moduleId: AppModuleId,
): boolean {
  return effectiveModuleLevel(user, moduleId) !== "none";
}

export const MODULE_LABELS: Record<AppModuleId, string> = {
  dashboard: "Dashboard",
  zones: "Zones",
  sectors: "Sectors",
  branches: "Branches",
  properties: "Properties",
  reports: "Summary report",
  departments: "Departments (publicity)",
  users: "User management",
};

export function defaultModuleAccessFormState(): Record<
  AppModuleId,
  ModuleAccessLevel
> {
  return Object.fromEntries(
    APP_MODULE_IDS.map((id) => [id, "edit" as const]),
  ) as Record<AppModuleId, ModuleAccessLevel>;
}

export function moduleAccessFromUser(
  raw?: Record<string, string>,
): Record<AppModuleId, ModuleAccessLevel> {
  const base = defaultModuleAccessFormState();
  if (!raw) return base;
  for (const id of APP_MODULE_IDS) {
    if (raw[id] === "view") base[id] = "view";
    if (raw[id] === "none") base[id] = "none";
  }
  return base;
}

export function formModuleAccessToPayload(
  state: Record<AppModuleId, ModuleAccessLevel>,
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const id of APP_MODULE_IDS) {
    if (state[id] === "view") out[id] = "view";
    if (state[id] === "none") out[id] = "none";
  }
  return Object.keys(out).length ? out : undefined;
}
