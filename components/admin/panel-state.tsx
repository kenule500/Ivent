"use client";

import * as React from "react";
import { AlertTriangle, Inbox, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared panel states (NFR-011) and a local error boundary (FR-043).
 *
 * Convex queries throw into the React tree, so a failing panel must be
 * contained here rather than blanking the whole page.
 */

interface PanelStateProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  skeletonRows?: number;
  onRetry?: () => void;
  className?: string;
  children: React.ReactNode;
}

function SkeletonLines({ rows }: { rows: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-4 animate-pulse rounded bg-muted"
          style={{ width: `${88 - index * 6}%` }}
        />
      ))}
    </div>
  );
}

export function PanelState({
  loading,
  error,
  empty,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  skeletonRows = 3,
  onRetry,
  className,
  children,
}: PanelStateProps) {
  if (loading) {
    return (
      <div
        className={cn("py-2", className)}
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        <SkeletonLines rows={skeletonRows} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn("flex flex-col items-start gap-3 py-4", className)}
        role="alert"
      >
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCcw aria-hidden="true" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 py-8 text-center",
          className
        )}
      >
        <Inbox className="size-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">{emptyTitle}</p>
        {emptyDescription && (
          <p className="max-w-sm text-xs text-muted-foreground">{emptyDescription}</p>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

interface PanelErrorBoundaryProps {
  children: React.ReactNode;
  /** Panel name used in the recovery copy. */
  label?: string;
  className?: string;
}

interface PanelErrorBoundaryState {
  hasError: boolean;
}

export class PanelErrorBoundary extends React.Component<
  PanelErrorBoundaryProps,
  PanelErrorBoundaryState
> {
  state: PanelErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PanelErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Keep the failure visible in the console without leaking it to the UI.
    console.error(`[admin panel] ${this.props.label ?? "panel"} failed`, error);
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div className={cn("space-y-3 py-4", this.props.className)} role="alert">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            <span>
              {this.props.label ?? "This panel"} could not load. Other panels are unaffected.
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={this.reset}>
            <RotateCcw aria-hidden="true" />
            Retry
          </Button>
        </div>
      );
    }

    return <>{this.props.children}</>;
  }
}
