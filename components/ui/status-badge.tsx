import { Badge } from "@/components/ui/badge";
import type { LandStatus } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const styles: Record<LandStatus, string> = {
  pending:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100",
  approved:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100",
  rejected:
    "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100",
};

const labels: Record<LandStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export function StatusBadge({
  status,
  className,
}: {
  status: LandStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-lg border px-2 py-0.5 text-xs font-medium capitalize shadow-none",
        styles[status],
        className,
      )}
    >
      {labels[status]}
    </Badge>
  );
}
