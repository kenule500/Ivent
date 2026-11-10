import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  /** Short heading that names the surface ("No tickets yet"). */
  title: string;
  /** One sentence that explains *why* it is empty, not just that it is. */
  reason: string;
  /** The relevant next step, when there is one. */
  action?: EmptyStateAction;
  icon?: ReactNode;
  className?: string;
}

/**
 * One empty state for every surface (FR-007).
 *
 * An empty screen is a dead end unless it says why it is empty and what to do
 * next, so the component requires a reason and makes the action optional but
 * prominent.
 */
export function EmptyState({
  title,
  reason,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 px-6 py-12 text-center",
        className
      )}
    >
      {icon ? (
        <div aria-hidden="true" className="text-muted-foreground">
          {icon}
        </div>
      ) : null}

      <h2 className="text-lg font-medium">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{reason}</p>

      {action ? (
        action.href ? (
          <Button
            render={<Link href={action.href} />}
            variant="outline"
            className="mt-2"
          >
            {action.label}
          </Button>
        ) : (
          <Button variant="outline" className="mt-2" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      ) : null}
    </div>
  );
}
