"use client";

import { useEffect } from "react";

import { RouteError } from "@/components/route-error";

export default function MyTicketsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Development-only visibility; the user never sees this (AC-005).
    if (process.env.NODE_ENV !== "production") {
      console.error("Tickets route failed:", error);
    }
  }, [error]);

  return (
    <RouteError
      title="We could not load your tickets"
      description="Something went wrong while loading your tickets. Try again, or browse events to find something new."
      onRetry={reset}
      homeHref="/explore"
    />
  );
}
