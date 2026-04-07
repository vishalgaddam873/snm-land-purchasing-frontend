import { Skeleton } from "@/components/ui/skeleton";

export default function LandLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-48 rounded-lg" />
        <Skeleton className="h-9 w-56 rounded-xl" />
        <Skeleton className="h-px w-full" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl sm:w-44" />
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
