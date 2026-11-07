"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PanelState } from "@/components/admin/panel-state";
import { DataTableAlt, type DataTableColumn, type DataTableRow } from "@/components/admin/data-table-alt";
import { cn } from "@/lib/utils";

/**
 * Shared chart card (T3.9): title, one-line interpretation, loading and empty
 * states, and an expandable data table that carries the same numbers.
 */

interface ChartCardProps {
  title: string;
  description: string;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  skeletonRows?: number;
  className?: string;
  table?: {
    caption: string;
    columns: DataTableColumn[];
    rows: DataTableRow[];
  };
  children: React.ReactNode;
}

export function ChartCard({
  title,
  description,
  loading,
  empty,
  emptyMessage = "No data for this filter set.",
  skeletonRows = 4,
  className,
  table,
  children,
}: ChartCardProps) {
  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <PanelState
          loading={loading}
          skeletonRows={skeletonRows}
          empty={!loading && empty}
          emptyTitle="No data"
          emptyDescription={emptyMessage}
        >
          {children}
        </PanelState>

        {!loading && !empty && table && table.rows.length > 0 && (
          <details className="rounded-lg border px-3 py-2">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              View data table
            </summary>
            <div className="pt-2">
              <DataTableAlt
                caption={table.caption}
                columns={table.columns}
                rows={table.rows}
              />
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
