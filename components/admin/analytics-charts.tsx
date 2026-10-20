"use client";

import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

/**
 * Presentational analytics charts (FR-015). Each component receives resolved
 * data so loading, errors, and data-table alternatives stay in ChartCard.
 */

export interface SeriesPoint {
  key: string;
  users: number;
  events: number;
  registrations: number;
  revenue: number;
  freeRevenue: number;
  paidRevenue: number;
}

const shortDate = (key: string) => key.slice(5);

// ============ GROWTH ============

interface GrowthTrendChartProps {
  buckets: SeriesPoint[];
  previous: SeriesPoint[] | null;
  compare: boolean;
}

const growthConfig: ChartConfig = {
  users: { label: "New users", color: "var(--chart-1)" },
  registrations: { label: "Registrations", color: "var(--chart-2)" },
  previousUsers: { label: "New users (previous)", color: "var(--chart-1)" },
  previousRegistrations: {
    label: "Registrations (previous)",
    color: "var(--chart-2)",
  },
};

export function GrowthTrendChart({ buckets, previous, compare }: GrowthTrendChartProps) {
  const data = buckets.map((bucket, index) => ({
    ...bucket,
    previousUsers: previous?.[index]?.users ?? null,
    previousRegistrations: previous?.[index]?.registrations ?? null,
  }));

  return (
    <ChartContainer config={growthConfig} className="h-[260px] w-full">
      <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
        <XAxis dataKey="key" tickFormatter={shortDate} tickLine={false} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="users"
          stroke="var(--color-users)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="registrations"
          stroke="var(--color-registrations)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        {compare && (
          <>
            <Line
              type="monotone"
              dataKey="previousUsers"
              stroke="var(--color-users)"
              strokeDasharray="4 4"
              strokeOpacity={0.45}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="previousRegistrations"
              stroke="var(--color-registrations)"
              strokeDasharray="4 4"
              strokeOpacity={0.45}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </>
        )}
      </LineChart>
    </ChartContainer>
  );
}

// ============ REVENUE ============

interface RevenueChartProps {
  buckets: SeriesPoint[];
  previous: SeriesPoint[] | null;
  compare: boolean;
  currency: string;
}

const revenueConfig: ChartConfig = {
  freeRevenue: { label: "Free registrations", color: "var(--chart-2)" },
  paidRevenue: { label: "Paid tickets", color: "var(--chart-1)" },
  previousRevenue: { label: "Previous period", color: "var(--chart-3)" },
};

export function RevenueChart({ buckets, previous, compare, currency }: RevenueChartProps) {
  const data = buckets.map((bucket, index) => ({
    ...bucket,
    previousRevenue: previous?.[index]?.revenue ?? null,
  }));

  return (
    <ChartContainer config={revenueConfig} className="h-[240px] w-full">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
        <XAxis dataKey="key" tickFormatter={shortDate} tickLine={false} minTickGap={24} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(value) => formatCurrency(Number(value), { currency })}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) =>
                formatCurrency(Number(value), { currency })
              }
            />
          }
        />
        <Area
          type="monotone"
          dataKey="freeRevenue"
          stackId="revenue"
          stroke="var(--color-freeRevenue)"
          fill="var(--color-freeRevenue)"
          fillOpacity={0.5}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="paidRevenue"
          stackId="revenue"
          stroke="var(--color-paidRevenue)"
          fill="var(--color-paidRevenue)"
          fillOpacity={0.5}
          isAnimationActive={false}
        />
        {compare && (
          <Line
            type="monotone"
            dataKey="previousRevenue"
            stroke="var(--color-previousRevenue)"
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
        )}
      </AreaChart>
    </ChartContainer>
  );
}

// ============ FUNNEL ============

export interface FunnelStep {
  key: string;
  label: string;
  value: number;
  conversionFromPrevious: number;
  conversionFromStart: number;
}

interface FunnelChartProps {
  steps: FunnelStep[];
}

export function FunnelChart({ steps }: FunnelChartProps) {
  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.key} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="font-medium">{step.label}</span>
            <span className="text-muted-foreground">
              {formatNumber(step.value)} · {formatPercent(step.conversionFromPrevious)}{" "}
              of previous
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(step.conversionFromStart * 100, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ CHECK-IN TREND ============

export interface CheckInPoint {
  key: string;
  confirmed: number;
  checkedIn: number;
}

const checkInConfig: ChartConfig = {
  confirmed: { label: "Confirmed", color: "var(--chart-2)" },
  checkedIn: { label: "Checked in", color: "var(--chart-1)" },
};

export function CheckInTrendChart({ trend }: { trend: CheckInPoint[] }) {
  return (
    <ChartContainer config={checkInConfig} className="h-[220px] w-full">
      <LineChart data={trend} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
        <XAxis dataKey="key" tickFormatter={shortDate} tickLine={false} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="confirmed"
          stroke="var(--color-confirmed)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="checkedIn"
          stroke="var(--color-checkedIn)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}

// ============ CAPACITY ============

export interface CapacityBucket {
  label: string;
  count: number;
}

const capacityConfig: ChartConfig = {
  count: { label: "Events", color: "var(--chart-3)" },
};

export function CapacityChart({ buckets }: { buckets: CapacityBucket[] }) {
  return (
    <ChartContainer config={capacityConfig} className="h-[220px] w-full">
      <BarChart data={buckets} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
        <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 11 }} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}

// ============ COHORTS ============

export interface CohortRow {
  key: string;
  newCount: number;
  returningCount: number;
  total: number;
}

const cohortConfig: ChartConfig = {
  newCount: { label: "New attendees", color: "var(--chart-1)" },
  returningCount: { label: "Returning", color: "var(--chart-2)" },
};

export function CohortChart({ cohorts }: { cohorts: CohortRow[] }) {
  return (
    <ChartContainer config={cohortConfig} className="h-[240px] w-full">
      <BarChart data={cohorts} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
        <XAxis dataKey="key" tickLine={false} tick={{ fontSize: 11 }} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="newCount"
          stackId="attendees"
          fill="var(--color-newCount)"
          radius={[0, 0, 0, 0]}
          isAnimationActive={false}
        />
        <Bar
          dataKey="returningCount"
          stackId="attendees"
          fill="var(--color-returningCount)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}

// ============ HEATMAP ============

interface HeatmapChartProps {
  weekdays: string[];
  hours: number[];
  matrix: number[][];
  max: number;
  timezone: string;
}

export function HeatmapChart({ weekdays, hours, matrix, max, timezone }: HeatmapChartProps) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <div className="min-w-[620px]">
          <div
            className="grid items-center gap-1"
            style={{ gridTemplateColumns: `2.5rem repeat(${hours.length}, minmax(0, 1fr))` }}
          >
            <span aria-hidden="true" />
            {hours.map((hour) => (
              <span
                key={hour}
                className="text-center text-[0.6rem] text-muted-foreground"
                aria-hidden="true"
              >
                {hour % 3 === 0 ? hour : ""}
              </span>
            ))}
            {weekdays.map((weekday, row) => (
              <div key={weekday} className="contents">
                <span className="text-[0.65rem] text-muted-foreground">{weekday}</span>
                {hours.map((hour) => {
                  const value = matrix[row][hour];
                  return (
                    <span
                      key={`${weekday}-${hour}`}
                      title={`${weekday} ${hour}:00 — ${value} registration${value === 1 ? "" : "s"} (${timezone})`}
                      className="aspect-square rounded-[2px] bg-primary"
                      style={{ opacity: value === 0 ? 0.06 : 0.2 + 0.8 * (value / max) }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
        <span>Fewer</span>
        <div className="flex gap-0.5" aria-hidden="true">
          {[0.15, 0.3, 0.5, 0.7, 1].map((opacity) => (
            <span
              key={opacity}
              className="size-3 rounded-[2px] bg-primary"
              style={{ opacity }}
            />
          ))}
        </div>
        <span>More · {formatNumber(max)} peak registrations</span>
      </div>
    </div>
  );
}

// ============ BREAKDOWN ============

export interface BreakdownRow {
  key: string;
  label: string;
  value: number;
}

const breakdownConfig: ChartConfig = {
  value: { label: "Registrations", color: "var(--chart-4)" },
};

export function BreakdownChart({ rows }: { rows: BreakdownRow[] }) {
  return (
    <ChartContainer config={breakdownConfig} className="h-[240px] w-full">
      <BarChart
        data={rows.slice(0, 8)}
        layout="vertical"
        margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
        <XAxis type="number" tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={110}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}
