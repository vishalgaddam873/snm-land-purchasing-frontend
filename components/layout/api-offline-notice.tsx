import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ApiOfflineNotice({
  title,
  error,
  hint,
}: {
  title: string;
  error: string;
  hint: string;
}) {
  return (
    <Card className="max-w-lg rounded-2xl border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-sm leading-relaxed">{hint}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="rounded-xl bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground break-all">
          {error}
        </p>
      </CardContent>
      <CardFooter>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "default", size: "sm" }), "rounded-xl")}
        >
          Back to dashboard
        </Link>
      </CardFooter>
    </Card>
  );
}
