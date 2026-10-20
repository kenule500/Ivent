"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { computeDelta } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Trend card with a named comparison window, a delta that never relies on
 * colour alone, and a sparkline (FR-007, AC-005).
 */

interface TrendCardProps {
  label: string;
  current: number;
  previous: number;
  sparkline: number[];
  windowLabel: string;
  formatValue: (value: number) => string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}

export function TrendCard({
  label,
  current,
  previous,
  sparkline,
  windowLabel,
  formatValue,
  icon: Icon,
  color = "text-foreground",
}: TrendCardProps) {
  const delta = computeDelta(current, previous);
  const DeltaIcon =
    delta.direction === "up"
      ? ArrowUpRight
      : delta.direction === "down"
        ? ArrowDownRight
        : Minus;

  const data = sparkline.map((value, index) => ({ index, value }));
  const hasSpark = data.some((point) => point.value > 0);

  return (
    <Card>
      <CardContent className="space-y-2 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className={cn("size-4 shrink-0", color)} aria-hidden="true" />
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
          </div>
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.7rem] font-medium",
              delta.direction === "up" && "bg-emerald-500/10 text-emerald-500",
              delta.direction === "down" && "bg-red-500/10 text-red-500",
              (delta.direction === "flat" || delta.direction === "new") &&
                "bg-muted text-muted-foreground"
            )}
            aria-label={`Change: ${delta.label}`}
          >
            <DeltaIcon className="size-3" aria-hidden="true" />
            {delta.label}
          </span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-2xl font-bold">{formatValue(current)}</p>
            <p className="text-[0.7rem] text-muted-foreground">
              vs {formatValue(previous)} · {windowLabel}
            </p>
          </div>

          <div className="h-10 w-20 shrink-0" aria-hidden="true">
            {hasSpark ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                    className={color}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full rounded bg-muted/40" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
