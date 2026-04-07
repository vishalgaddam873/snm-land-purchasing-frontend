"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { cn } from "@/lib/utils";
import { Layers, LogOut, Menu, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { MissionLogo } from "./mission-logo";

function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({
  onNavigate,
  role,
}: {
  onNavigate?: () => void;
  role?: "superadmin" | "admin" | "moderator";
}) {
  const pathname = usePathname();
  const adminItems =
    role === "superadmin"
      ? [
          {
            label: "Users",
            href: "/admin/users",
            icon: Shield,
          },
          {
            label: "Departments",
            href: "/departments",
            icon: Layers,
          },
        ]
      : [];

  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {mainNav.map((item) => {
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
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const [me, setMe] = React.useState<{
    name?: string;
    email?: string;
    role?: "superadmin" | "admin" | "moderator";
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
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <MissionLogo size="sm" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-muted-foreground">
              Sant Nirankari Mission
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
            Land and Building Maintenance
            </p>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <SidebarNav role={me?.role} />
        </ScrollArea>
        <div className="border-t border-sidebar-border p-3">
          <p className="px-3 text-xs leading-relaxed text-muted-foreground">
            Transparency · Care · Service
          </p>
        </div>
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
                  role={me?.role}
                  onNavigate={() => setOpen(false)}
                />
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-sm text-muted-foreground">
              Nirankari Mission — Land and Building Maintenance
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {meLoading ? null : me ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "rounded-xl",
                  )}
                >
                  <Avatar className="mr-2 size-6">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {String(me?.name ?? "U")
                        .slice(0, 1)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">
                    {me?.name ?? "User"}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="space-y-0.5">
                    <div className="text-sm font-semibold text-foreground">
                      {me?.name ?? "User"}
                    </div>
                    <div className="text-xs font-normal text-muted-foreground">
                      {me?.email ?? ""}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {me?.role === "superadmin" ? (
                    <DropdownMenuItem
                      onClick={() => {
                        router.push("/admin/users");
                      }}
                    >
                        <Shield className="mr-2 size-4" />
                        User management
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 size-4" />
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

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
