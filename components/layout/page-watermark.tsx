"use client";

import * as React from "react";

/**
 * Non-interactive overlay for traceability (e.g. department scope on screenshots).
 * Does not replace server-side access control.
 */
export function PageWatermark({ text }: { text: string }) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const tiles = React.useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-10 opacity-[0.07]">
        {tiles.map((i) => (
          <span
            key={i}
            className="whitespace-nowrap text-[clamp(0.85rem,1.6vw,1.1rem)] font-semibold tracking-wide text-foreground"
            style={{
              transform: "rotate(-28deg)",
              userSelect: "none",
            }}
          >
            {trimmed}
          </span>
        ))}
      </div>
    </div>
  );
}
