import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export function MissionLogo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const box =
    size === "lg"
      ? "size-14 rounded-2xl"
      : size === "sm"
        ? "size-10 rounded-xl"
        : "size-12 rounded-xl";
  const icon = size === "lg" ? "size-7" : size === "sm" ? "size-5" : "size-6";

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20",
        box,
        className,
      )}
      aria-hidden
    >
      <Sparkles className={icon} strokeWidth={1.75} />
    </div>
  );
}
