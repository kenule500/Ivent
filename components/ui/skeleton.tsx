import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The single shimmer implementation (FR-001).
 *
 * Routes compose this into their own layout rather than inventing variants, so
 * the animation and the reduced-motion behaviour live in one place. It is
 * always hidden from assistive technology: the surrounding surface announces
 * its loading state once (NFR-003).
 */
function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-muted",
        "motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
