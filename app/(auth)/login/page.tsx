import type { Metadata } from "next";
import { LoginForm } from "@/components/forms/login-form";
import { MissionLogo } from "@/components/layout/mission-logo";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <MissionLogo size="lg" />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
           Land and Building Maintenance
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Sant Nirankari Mission — quiet, transparent access for authorised
            coordinators.
          </p>
        </div>
      </div>

      <LoginForm />

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Need access?{" "}
        <Link href="/dashboard" className="text-primary underline-offset-4 hover:underline">
          Continue to dashboard (demo)
        </Link>
      </p>
    </div>
  );
}
