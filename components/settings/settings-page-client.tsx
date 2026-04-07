"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/utils";
import { LogOut, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

type MeUser = {
  _id?: string;
  name?: string;
  email?: string;
  username?: string;
  contact?: string;
  role?: string;
};

export function SettingsPageClient() {
  const router = useRouter();
  const [user, setUser] = React.useState<MeUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [password, setPassword] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        const u = data?.user as MeUser | undefined;
        if (!cancelled && u) {
          setUser(u);
          setName(u.name ?? "");
          setEmail(u.email ?? "");
          setUsername(u.username ?? "");
          setContact(u.contact ?? "");
        }
      } finally {
        if (!cancelled) setLoading(false);
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

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (name.trim() !== (user?.name ?? "")) body.name = name.trim();
      if (email.trim().toLowerCase() !== (user?.email ?? "").toLowerCase()) {
        body.email = email.trim().toLowerCase();
      }
      if (username.trim().toLowerCase() !== (user?.username ?? "").toLowerCase()) {
        body.username = username.trim().toLowerCase();
      }
      if (contact.trim() !== (user?.contact ?? "")) body.contact = contact.trim();
      if (password.trim().length > 0) body.password = password.trim();

      if (Object.keys(body).length === 0) {
        setOkMsg("Nothing to update.");
        return;
      }

      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          Array.isArray(data?.message)
            ? data.message.join(", ")
            : data?.message ?? "Update failed",
        );
        return;
      }
      setUser(data as MeUser);
      setName((data as MeUser).name ?? name);
      setEmail((data as MeUser).email ?? email);
      setUsername((data as MeUser).username ?? username);
      setContact((data as MeUser).contact ?? contact);
      setPassword("");
      setOkMsg("Profile updated.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const crumbs = [
    { href: "/dashboard", label: "Home" },
    { label: "Settings" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your account details and sign out when you are done."
        crumbs={crumbs}
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      ) : !user ? (
        <p className="text-sm text-destructive">Could not load your profile.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="rounded-2xl border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Your profile</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={saveProfile}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="settings-name">Full name</Label>
                      <Input
                        id="settings-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-10 rounded-xl"
                        autoComplete="name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="settings-email">Email</Label>
                      <Input
                        id="settings-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-10 rounded-xl"
                        autoComplete="email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="settings-username">Username</Label>
                      <Input
                        id="settings-username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="h-10 rounded-xl"
                        autoComplete="username"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="settings-contact">Contact</Label>
                      <Input
                        id="settings-contact"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        className="h-10 rounded-xl"
                        autoComplete="tel"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="settings-password">New password</Label>
                      <PasswordInput
                        id="settings-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-10 rounded-xl"
                        autoComplete="new-password"
                        placeholder="Leave blank to keep current password"
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum 6 characters if you change it.
                      </p>
                    </div>
                  </div>

                  {error ? (
                    <p className="text-sm text-destructive">{error}</p>
                  ) : null}
                  {okMsg ? (
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                      {okMsg}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      className="rounded-xl shadow-sm"
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Save changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-2xl border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Role:{" "}
                  <span className="font-medium text-foreground">
                    {user.role ?? "—"}
                  </span>
                </p>
                <Separator />
                {user.role === "superadmin" ? (
                  <Link
                    href="/admin/users"
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "inline-flex w-full items-center justify-center gap-2 rounded-xl",
                    )}
                  >
                    <Shield className="size-4" />
                    User management
                  </Link>
                ) : null}
                <Button
                  type="button"
                  variant="destructive"
                  className={cn(
                    "w-full rounded-xl",
                    user.role === "superadmin" ? "" : "",
                  )}
                  onClick={() => void logout()}
                >
                  <LogOut className="size-4" />
                  Log out
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
