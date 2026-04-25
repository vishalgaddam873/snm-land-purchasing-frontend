import { cn } from "@/lib/utils";
import Image from "next/image";

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

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-background shadow-sm ring-1 ring-border",
        box,
        className,
      )}
      aria-hidden
    >
      <Image
        src="/logo.png"
        alt=""
        width={64}
        height={64}
        className="size-[70%] object-contain"
        priority={size === "lg"}
      />
    </div>
  );
}
