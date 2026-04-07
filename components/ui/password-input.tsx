"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  id: string;
};

function PasswordInput({ className, id, ...props }: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative isolate grid w-full grid-cols-1">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        className={cn("col-start-1 row-start-1 min-h-0 w-full pr-10", className)}
        {...props}
      />
      <div className="pointer-events-none col-start-1 row-start-1 flex items-center justify-end self-stretch pe-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="pointer-events-auto shrink-0 rounded-lg text-muted-foreground shadow-none ring-0 hover:text-foreground active:!translate-y-0"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          aria-controls={id}
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </Button>
      </div>
    </div>
  );
}

export { PasswordInput };
