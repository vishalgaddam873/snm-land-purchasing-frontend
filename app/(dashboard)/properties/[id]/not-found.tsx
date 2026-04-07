import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PropertyNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <h1 className="text-2xl font-semibold text-foreground">
        Property not found
      </h1>
      <p className="text-sm text-muted-foreground">
        This record may have been removed or the link is incorrect.
      </p>
      <Link
        href="/properties"
        className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
      >
        Back to properties
      </Link>
    </div>
  );
}
