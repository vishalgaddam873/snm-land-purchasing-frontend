"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { mainNav } from "@/lib/nav";
import type { AppModuleId } from "@/lib/auth/module-access";
import { moduleAllowsView } from "@/lib/auth/module-access";
import { cn } from "@/lib/utils";
import { ChevronDown, Layers, LogOut, Menu, Shield, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { MissionLogo } from "./mission-logo";
import { PageWatermark } from "@/components/layout/page-watermark";
import { ModuleAccessProvider } from "@/components/auth/module-access-context";
import { ScreenShield } from "@/components/security/screen-shield";

function roleDisplayLabel(role?: "superadmin" | "admin" | "moderator") {
  if (role === "superadmin") return "Super Admin";
  if (role === "admin") return "Admin";
  if (role === "moderator") return "Moderator";
  return "User";
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (
      (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    );
  }
  const t = name.trim();
  if (t.length >= 2) return t.slice(0, 2).toUpperCase();
  return (t[0] ?? "U").toUpperCase();
}

function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navModuleVisible(
  me: {
    role?: "superadmin" | "admin" | "moderator";
    moduleAccess?: Record<string, string>;
  } | null,
  meLoading: boolean,
  moduleId?: AppModuleId,
): boolean {
  if (!moduleId) return true;
  if (meLoading || !me) return false;
  return moduleAllowsView(me, moduleId);
}

function SidebarNav({
  onNavigate,
  me,
  meLoading,
}: {
  onNavigate?: () => void;
  me: {
    role?: "superadmin" | "admin" | "moderator";
    moduleAccess?: Record<string, string>;
  } | null;
  meLoading: boolean;
}) {
  const pathname = usePathname();
  const adminItems =
    me?.role === "superadmin"
      ? [
          {
            label: "Users",
            href: "/admin/users",
            icon: Shield,
            moduleId: "users" as const,
          },
          {
            label: "Departments",
            href: "/departments",
            icon: Layers,
            moduleId: "departments" as const,
          },
        ].filter((item) => navModuleVisible(me, meLoading, item.moduleId))
      : [];

  const visibleMainNav = mainNav.filter((item) =>
    navModuleVisible(me, meLoading, item.moduleId),
  );

  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {meLoading ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">Loading menu…</p>
      ) : null}
      {!meLoading
        ? visibleMainNav.map((item) => {
            const active = isNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                {item.label}
              </Link>
            );
          })
        : null}

      {adminItems.length ? (
        <div className="mt-3 pt-3 border-t border-sidebar-border/80">
          <p className="px-3 pb-2 text-[11px] font-medium text-muted-foreground">
            Administration
          </p>
          {adminItems.map((item) => {
            const active = isNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </nav>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
  const [me, setMe] = React.useState<{
    name?: string;
    email?: string;
    role?: "superadmin" | "admin" | "moderator";
    moduleAccess?: Record<string, string>;
    departmentWatermark?: string;
  } | null>(null);
  const [meLoading, setMeLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setMeLoading(true);
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!cancelled) {
        setMe(data?.user ?? null);
        setMeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setProfileMenuOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-background">
      <ScreenShield />
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <MissionLogo size="sm" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-muted-foreground">
                Properties Details
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
            Land and Building Details
            </p>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <SidebarNav me={me} meLoading={meLoading} />
        </ScrollArea>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border/80 bg-card/90 px-4 backdrop-blur-sm supports-backdrop-filter:bg-card/75">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open menu"
                />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b border-border px-4 py-4 text-left">
                <SheetTitle className="flex items-center gap-3">
                  <MissionLogo size="sm" />
                  <span className="text-base font-semibold">Land Purchasing</span>
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-5rem)]">
                <SidebarNav
                  me={me}
                  meLoading={meLoading}
                  onNavigate={() => setOpen(false)}
                />
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-sm text-muted-foreground">
              Properties Details
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {meLoading ? null : me ? (
              <DropdownMenu
                open={profileMenuOpen}
                onOpenChange={setProfileMenuOpen}
              >
                <DropdownMenuTrigger
                  className={cn(
                    "flex max-w-[min(100%,18rem)] items-center gap-2.5 rounded-full border border-border/90 bg-background px-2 py-1.5 pl-2 pr-2 text-left shadow-sm outline-none transition-colors",
                    "hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
                    profileMenuOpen && "bg-muted/40",
                  )}
                  aria-label="Account menu"
                >
                  <Avatar className="size-9 shrink-0 border border-border/60">
                    <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                      {initialsFromName(me.name ?? "User")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 max-sm:hidden">
                    <p className="truncate text-sm font-semibold leading-tight text-foreground">
                      {me.name ?? "User"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {roleDisplayLabel(me.role)}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      profileMenuOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-52 rounded-xl p-1.5 shadow-lg ring-1 ring-foreground/10"
                >
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 rounded-lg py-2"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/settings");
                    }}
                  >
                    <User className="size-4 text-muted-foreground" />
                    Profile
                  </DropdownMenuItem>
                  {me.role === "superadmin" ? (
                    <DropdownMenuItem
                      className="cursor-pointer gap-2 rounded-lg py-2"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        router.push("/admin/users");
                      }}
                    >
                      <Shield className="size-4 text-muted-foreground" />
                      User management
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    variant="destructive"
                    className="cursor-pointer gap-2 rounded-lg py-2"
                    onClick={() => void logout()}
                  >
                    <LogOut className="size-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "hidden sm:inline-flex",
                )}
              >
                Sign in
              </Link>
            )}
          </div>
        </header>

        <main className="relative flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {!meLoading && me?.departmentWatermark ? (
            <PageWatermark text={me.departmentWatermark} />
          ) : null}
          <ModuleAccessProvider user={me} ready={!meLoading && Boolean(me)}>
            <div className="relative z-10 mx-auto w-full max-w-6xl space-y-8">
              {children}
            </div>
          </ModuleAccessProvider>
        </main>
      </div>
    </div>
  );
}
