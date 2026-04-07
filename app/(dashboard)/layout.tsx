import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getAuthToken } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getAuthToken();
  if (!token) redirect("/login");
  return <DashboardShell>{children}</DashboardShell>;
}
