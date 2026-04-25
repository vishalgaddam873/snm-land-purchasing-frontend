import { ScreenShield } from "@/components/security/screen-shield";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ScreenShield />
      {children}
    </div>
  );
}
