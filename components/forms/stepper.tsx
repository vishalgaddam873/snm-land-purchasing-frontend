"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function Stepper({
  steps,
  current,
  className,
}: {
  steps: string[];
  current: number;
  className?: string;
}) {
  return (
    <ol
      className={cn(
        "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {steps.map((label, index) => {
        const stepNum = index + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        return (
          <li
            key={label}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-3 py-3 transition-colors",
              active
                ? "border-primary/40 bg-primary/5"
                : "border-border/80 bg-card",
              done && "border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                done && "bg-emerald-600 text-white",
                active && !done && "bg-primary text-primary-foreground",
                !active && !done && "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" /> : stepNum}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Step {stepNum}
              </p>
              <p className="text-sm font-semibold text-foreground">{label}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
