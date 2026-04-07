import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ClipboardCheck,
  FolderOpen,
  GitBranch,
  Home,
  Landmark,
  LineChart,
  MapPin,
  PlusCircle,
  Settings,
  Users,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Land Records", href: "/land", icon: Landmark },
  { label: "Add Land", href: "/land/add", icon: PlusCircle },
  { label: "Owners", href: "/owners", icon: Users },
  { label: "Zones", href: "/zones", icon: MapPin },
  { label: "Branches", href: "/branches", icon: GitBranch },
  { label: "Properties", href: "/properties", icon: Building2 },
  { label: "Documents", href: "/documents", icon: FolderOpen },
  { label: "Approvals", href: "/approvals", icon: ClipboardCheck },
  { label: "Reports", href: "/reports", icon: LineChart },
  { label: "Settings", href: "/settings", icon: Settings },
];
