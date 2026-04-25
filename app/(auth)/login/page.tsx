import type { Metadata } from "next";
import { LoginForm } from "@/components/forms/login-form";
import { MissionLogo } from "@/components/layout/mission-logo";

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
            Properties Details
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Properties Details
          </p>
        </div>
      </div>

      <LoginForm />
    </div>
  );
}
