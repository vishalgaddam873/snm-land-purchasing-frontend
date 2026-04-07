"use client";

import * as React from "react";

/**
 * Client-rendered <body> so `suppressHydrationWarning` is honored during
 * client hydration when browser extensions mutate <body> (e.g. ColorZilla).
 */
export function RootBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <body className={className} suppressHydrationWarning>
      {children}
    </body>
  );
}
