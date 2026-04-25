import type { LucideIcon } from "lucide-react";
import {
  Building2,
  GitBranch,
  Home,
  LayoutGrid,
  LineChart,
  MapPin,
  Settings,
} from "lucide-react";
import type { AppModuleId } from "@/lib/auth/module-access";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** If set, the link is shown only when the user has view or edit for this module. */
  moduleId?: AppModuleId;
};

export const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home, moduleId: "dashboard" },
  { label: "Zones", href: "/zones", icon: MapPin, moduleId: "zones" },
  { label: "Sectors", href: "/sectors", icon: LayoutGrid, moduleId: "sectors" },
  { label: "Branches", href: "/branches", icon: GitBranch, moduleId: "branches" },
  {
    label: "Properties",
    href: "/properties",
    icon: Building2,
    moduleId: "properties",
  },
  {
    label: "Summary Report",
    href: "/reports",
    icon: LineChart,
    moduleId: "reports",
  },
  /** Profile / account — not tied to a feature module. */
  { label: "Settings", href: "/settings", icon: Settings },
];
