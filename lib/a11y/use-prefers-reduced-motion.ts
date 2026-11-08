"use client";

import * as React from "react";

/**
 * Reactive `prefers-reduced-motion` (AC-007, T3.1).
 *
 * The CSS media query already disables transitions, but JS-driven motion —
 * embla autoplay, for one — keeps running unless the component knows about the
 * preference. Returns false during SSR and updates after mount.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}
