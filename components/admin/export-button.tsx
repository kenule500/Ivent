"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { AnalyticsFilters } from "@/lib/analytics-filters";

/**
 * One export trigger for every list and analytics view (FR-018, FR-020).
 * The server builds the CSV; this component only turns it into a download.
 */

type ExportModule = "users" | "events" | "registrations" | "audit" | "analytics" | "report";

interface ExportButtonProps {
  module: ExportModule;
  search?: string;
  filters?: AnalyticsFilters;
  eventId?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function ExportButton({
  module,
  search,
  filters,
  eventId,
  label = "Export CSV",
  disabled,
  className,
}: ExportButtonProps) {
  const generate = useMutation(api.exports.generate);
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const result = await generate({
        module,
        search: search?.trim() || undefined,
        eventId: eventId as Id<"events"> | undefined,
        filters: filters
          ? {
              ...filters,
              organizerId: filters.organizerId as Id<"users"> | undefined,
            }
          : undefined,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      toast.success(
        `${result.rowCount.toLocaleString("en-US")} rows exported to ${result.filename}`
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The export failed. Try again with a narrower filter."
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={() => void handleExport()}
      disabled={disabled || isExporting}
      className={className}
    >
      {isExporting ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="size-4" aria-hidden="true" />
      )}
      {isExporting ? "Preparing…" : label}
    </Button>
  );
}
