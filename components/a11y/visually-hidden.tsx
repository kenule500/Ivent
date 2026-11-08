import { cn } from "@/lib/utils";

/**
 * Screen-reader-only text (AC-003, T1.2).
 *
 * Uses the clip pattern rather than `display: none`, so the content stays in
 * the accessibility tree. Accepts `className` for the rare case where the
 * hidden text needs to look different when it becomes visible on focus.
 */
export function VisuallyHidden({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn("sr-only", className)}>{children}</span>;
}
