"use client";

import { ArrowDownRight, ArrowUpRight, Minus, Users, Calendar, Ticket, TrendingUp, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PanelState } from "@/components/admin/panel-state";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Filter-aware summary cards (FR-014, AC-011).
 * Direction is conveyed by icon and sign, never colour alone.
 */

interface Delta {
  absolute: number;
  percent: number | null;
  direction: "up" | "down" | "flat";
}

interface SummaryNumbers {
  users: number;
  events: number;
  registrations: number;
  revenue: number;
  checkInRate: number;
  checkIns: number;
  confirmed: number;
}

interface AnalyticsSummaryProps {
  loading?: boolean;
  compare: boolean;
  currency: string;
  summary:
    | {
        current: SummaryNumbers;
        previous: SummaryNumbers;
        deltas: Record<string, Delta>;
        rowCounts: {
          events: number;
          registrations: number;
          users: number;
          truncated: boolean;
        };
      }
    | undefined;
}

const ITEMS = [
  { key: "users", label: "New users", icon: Users, kind: "count" as const },
  { key: "events", label: "New events", icon: Calendar, kind: "count" as const },
  {
    key: "registrations",
    label: "Registrations",
    icon: Ticket,
    kind: "count" as const,
  },
  { key: "revenue", label: "Estimated revenue", icon: TrendingUp, kind: "money" as const },
  {
    key: "checkInRate",
    label: "Check-in rate",
    icon: CheckCircle2,
    kind: "percent" as const,
  },
];

export function AnalyticsSummary({ loading, summary, compare, currency }: AnalyticsSummaryProps) {
  const formatValue = (kind: "count" | "money" | "percent", value: number) => {
    if (kind === "money") return formatCurrency(value, { currency });
    if (kind === "percent") return formatPercent(value);
    return formatNumber(value);
  };

  return (
    <PanelState loading={loading} skeletonRows={4}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {ITEMS.map((item) => {
          const current = summary?.current[item.key as keyof SummaryNumbers] ?? 0;
          const previous = summary?.previous[item.key as keyof SummaryNumbers] ?? 0;
          const delta = summary?.deltas[item.key];
          const Icon = item.icon;
          const DeltaIcon =
            delta?.direction === "up"
              ? ArrowUpRight
              : delta?.direction === "down"
                ? ArrowDownRight
                : Minus;

          return (
            <Card key={item.key}>
              <CardContent className="space-y-1 p-4">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                </div>
                <p className="text-2xl font-bold">
                  {formatValue(item.kind, current)}
                </p>
                {compare ? (
                  <p
                    className={cn(
                      "flex items-center gap-1 text-[0.7rem]",
                      delta?.direction === "up" && "text-emerald-500",
                      delta?.direction === "down" && "text-red-500",
                      (!delta || delta.direction === "flat") && "text-muted-foreground"
                    )}
                  >
                    <DeltaIcon className="size-3" aria-hidden="true" />
                    <span>
                      {delta?.percent === null || delta?.percent === undefined
                        ? delta?.absolute === 0
                          ? "no change"
                          : "new"
                        : `${delta.percent > 0 ? "+" : ""}${delta.percent.toFixed(1)}%`}
                    </span>
                    <span className="text-muted-foreground">
                      vs {formatValue(item.kind, previous)}
                    </span>
                  </p>
                ) : (
                  <p className="text-[0.7rem] text-muted-foreground">
                    Comparison off
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {summary?.rowCounts && (
        <p className="mt-2 text-[0.7rem] text-muted-foreground">
          Scanning {formatNumber(summary.rowCounts.events)} events,{" "}
          {formatNumber(summary.rowCounts.registrations)} registrations, and{" "}
          {formatNumber(summary.rowCounts.users)} users in this range.
          {summary.rowCounts.truncated &&
            " Range too large for a full scan; narrow the dates or filters."}
        </p>
      )}
    </PanelState>
  );
}
