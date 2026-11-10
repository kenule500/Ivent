"use client";

import Link from "next/link";
import { useEffect } from "react";

import { useAnnounce } from "@/components/a11y/live-region";
import { Button } from "@/components/ui/button";

interface RouteErrorProps {
  title: string;
  description: string;
  /** Next.js `reset`, which re-mounts the failed segment. */
  onRetry: () => void;
  homeHref?: string;
}

/**
 * Shared recovery surface for route error boundaries (FR-006).
 *
 * Deliberately takes no error object: no message, digest, stack trace, or
 * internal id may reach the user. The failure is announced once and the page
 * keeps a working way home, so one broken query does not strand anyone
 * (AC-005, NFR-003).
 */
export function RouteError({
  title,
  description,
  onRetry,
  homeHref = "/",
}: RouteErrorProps) {
  const announce = useAnnounce();

  useEffect(() => {
    announce(`${title}. ${description}`);
  }, [announce, description, title]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={onRetry}>Try again</Button>
        <Button variant="outline" render={<Link href={homeHref} />}>
          Go home
        </Button>
      </div>
    </div>
  );
}
