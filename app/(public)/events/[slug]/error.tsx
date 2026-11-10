"use client";

import { useEffect } from "react";

import { RouteError } from "@/components/route-error";

export default function EventError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Development-only visibility; the user never sees this (AC-005).
    if (process.env.NODE_ENV !== "production") {
      console.error("Event route failed:", error);
    }
  }, [error]);

  return (
    <RouteError
      title="We could not load this event"
      description="Something went wrong while loading the event details. You can try again, or head back to the events you were browsing."
      onRetry={reset}
      homeHref="/explore"
    />
  );
}
