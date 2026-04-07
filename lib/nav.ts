import type { LucideIcon } from "lucide-react";
import {
  Building2,
  GitBranch,
  Home,
  LineChart,
  MapPin,
  Settings,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Zones", href: "/zones", icon: MapPin },
  { label: "Branches", href: "/branches", icon: GitBranch },
  { label: "Properties", href: "/properties", icon: Building2 },
  { label: "Reports", href: "/reports", icon: LineChart },
  { label: "Settings", href: "/settings", icon: Settings },
];
