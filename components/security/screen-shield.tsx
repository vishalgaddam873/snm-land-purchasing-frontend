"use client";

import * as React from "react";

/**
 * NOTE: Browsers cannot reliably block OS-level screenshots.
 * This is a best-effort "screen shield" UX that blanks the UI when the tab
 * is hidden, loses focus, or printing is attempted.
 */
export function ScreenShield() {
  const [shieldOn, setShieldOn] = React.useState(false);

  React.useEffect(() => {
    let keyTimeout: number | undefined;

    const enable = () => setShieldOn(true);
    const disable = () => setShieldOn(false);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") enable();
      else disable();
    };

    const onBlur = () => enable();
    const onFocus = () => disable();

    const onBeforePrint = () => enable();
    const onAfterPrint = () => disable();

    const onKeyDown = (e: KeyboardEvent) => {
      // Best-effort: some environments expose PrintScreen; many do not.
      // We still blank briefly to reduce accidental captures.
      if (e.key === "PrintScreen") {
        enable();
        if (keyTimeout) window.clearTimeout(keyTimeout);
        keyTimeout = window.setTimeout(() => disable(), 1200);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    window.addEventListener("keydown", onKeyDown);

    onVisibility();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      window.removeEventListener("keydown", onKeyDown);
      if (keyTimeout) window.clearTimeout(keyTimeout);
    };
  }, []);

  if (!shieldOn) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[9999] bg-black"
    />
  );
}

