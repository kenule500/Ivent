"use client";

import * as React from "react";
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexQuery } from "@/hooks/useConvexQuery";
import { PageHeader } from "@/components/admin/page-header";
import { PanelErrorBoundary } from "@/components/admin/panel-state";
import { ChartCard } from "@/components/admin/chart-card";
import { AnalyticsSummary } from "@/components/admin/analytics-summary";
import {
  AnalyticsFilterBar,
  type FilterOptions,
} from "@/components/admin/analytics-filters";
import {
  BreakdownChart,
  CapacityChart,
  CheckInTrendChart,
  CohortChart,
  FunnelChart,
  GrowthTrendChart,
  HeatmapChart,
  RevenueChart,
  type BreakdownRow,
  type CohortRow,
  type SeriesPoint,
} from "@/components/admin/analytics-charts";
import {
  clearDimensionFilters,
  filtersToSearchParams,
  parseFilterSearchParams,
  validateRange,
  type AnalyticsFilters,
} from "@/lib/analytics-filters";
import { DEFAULT_CURRENCY, formatCurrency, formatNumber, formatPercent } from "@/lib/format";

const CURRENCY = DEFAULT_CURRENCY;

export default function AdminAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AnalyticsWorkspace />
    </Suspense>
  );
}

function AnalyticsWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pulse = useMutation(api.analytics.pulse);

  const parsed = React.useMemo(
    () => parseFilterSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const [error, setError] = React.useState<string | null>(
    parsed.invalid ? (parsed.message ?? "The date range was invalid and has been reset.") : null
  );

  const filters = parsed.filters;
  const compare = parsed.compare;

  const serverFilters = React.useMemo(
    () => ({
      ...filters,
      organizerId: filters.organizerId as Id<"users"> | undefined,
    }),
    [filters]
  );

  // Consume the analytics rate-limit budget once per filter signature.
  const signature = JSON.stringify(serverFilters);
  React.useEffect(() => {
    void pulse().catch(() => {
      // The query error boundary surfaces exhausted budgets; a failed pulse is
      // itself harmless, so it must not break the page.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const navigate = React.useCallback(
    (next: AnalyticsFilters, nextCompare: boolean) => {
      const params = filtersToSearchParams(
        { ...next, organizerId: next.organizerId || undefined },
        { compare: nextCompare }
      );
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router]
  );

  const handleFiltersChange = React.useCallback(
    (next: AnalyticsFilters) => {
      const validation = validateRange(next.start, next.end);
      if (!validation.ok) {
        setError(validation.message ?? "Invalid date range.");
        return;
      }
      setError(null);
      navigate(next, compare);
    },
    [compare, navigate]
  );

  const handleCompareChange = React.useCallback(
    (next: boolean) => navigate(filters, next),
    [filters, navigate]
  );

  const summary = useConvexQuery(api.analytics.getSummary, { filters: serverFilters });
  const timeSeries = useConvexQuery(api.analytics.getTimeSeries, {
    filters: serverFilters,
    compare,
  });
  const funnel = useConvexQuery(api.analytics.getFunnel, { filters: serverFilters });
  const cohorts = useConvexQuery(api.analytics.getCohorts, { filters: serverFilters });
  const heatmap = useConvexQuery(api.analytics.getHeatmap, { filters: serverFilters });
  const options = useConvexQuery(api.analytics.getFilterOptions, {});

  const categoryBreakdown = useConvexQuery(api.analytics.getBreakdown, {
    filters: serverFilters,
    dimension: "category",
  });
  const countryBreakdown = useConvexQuery(api.analytics.getBreakdown, {
    filters: serverFilters,
    dimension: "country",
  });
  const cityBreakdown = useConvexQuery(api.analytics.getBreakdown, {
    filters: serverFilters,
    dimension: "city",
  });
  const ticketBreakdown = useConvexQuery(api.analytics.getBreakdown, {
    filters: serverFilters,
    dimension: "ticketType",
  });

  const buckets: SeriesPoint[] = timeSeries.data?.buckets ?? [];
  const previousSeries = timeSeries.data?.previous ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        description="Filtered demand, conversion, retention, and revenue for one consistent window."
        breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Analytics" }]}
      />

      <AnalyticsFilterBar
        filters={filters}
        options={options.data as FilterOptions | undefined}
        compare={compare}
        error={error}
        onChange={handleFiltersChange}
        onCompareChange={handleCompareChange}
        onClearAll={() => handleFiltersChange(clearDimensionFilters(filters))}
      />

      <PanelErrorBoundary label="Summary">
        <AnalyticsSummary
          loading={summary.isLoading}
          summary={summary.data}
          compare={compare}
          currency={CURRENCY}
        />
      </PanelErrorBoundary>

      <div className="grid gap-4 xl:grid-cols-2">
        <PanelErrorBoundary label="Growth trend">
          <ChartCard
            title="Growth"
            description="New users and registrations per day in the platform timezone."
            loading={timeSeries.isLoading}
            empty={buckets.length === 0}
            table={{
              caption: "Growth by day",
              columns: [
                { key: "day", label: "Day" },
                { key: "users", label: "New users", align: "right" },
                { key: "registrations", label: "Registrations", align: "right" },
                { key: "events", label: "New events", align: "right" },
              ],
              rows: buckets.map((bucket) => ({
                key: bucket.key,
                cells: [bucket.key, bucket.users, bucket.registrations, bucket.events],
              })),
            }}
          >
            <GrowthTrendChart
              buckets={buckets}
              previous={previousSeries}
              compare={compare}
            />
          </ChartCard>
        </PanelErrorBoundary>

        <PanelErrorBoundary label="Revenue">
          <ChartCard
            title="Revenue split"
            description="Confirmed registrations valued at each event's ticket price; free and paid stacked."
            loading={timeSeries.isLoading}
            empty={buckets.length === 0}
            table={{
              caption: "Revenue by day",
              columns: [
                { key: "day", label: "Day" },
                { key: "paid", label: "Paid", align: "right" },
                { key: "free", label: "Free", align: "right" },
                { key: "total", label: "Total", align: "right" },
              ],
              rows: buckets.map((bucket) => ({
                key: bucket.key,
                cells: [
                  bucket.key,
                  formatCurrency(bucket.paidRevenue, { currency: CURRENCY }),
                  formatCurrency(bucket.freeRevenue, { currency: CURRENCY }),
                  formatCurrency(bucket.revenue, { currency: CURRENCY }),
                ],
              })),
            }}
          >
            <RevenueChart
              buckets={buckets}
              previous={previousSeries}
              compare={compare}
              currency={CURRENCY}
            />
          </ChartCard>
        </PanelErrorBoundary>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PanelErrorBoundary label="Funnel">
          <ChartCard
            title="Registration funnel"
            description="Registered to confirmed to checked in, with step conversion."
            loading={funnel.isLoading}
            empty={(funnel.data?.steps[0]?.value ?? 0) === 0}
            table={{
              caption: "Funnel conversion",
              columns: [
                { key: "step", label: "Step" },
                { key: "value", label: "Count", align: "right" },
                { key: "prev", label: "Of previous", align: "right" },
                { key: "start", label: "Of registered", align: "right" },
              ],
              rows: (funnel.data?.steps ?? []).map((step) => ({
                key: step.key,
                cells: [
                  step.label,
                  formatNumber(step.value),
                  formatPercent(step.conversionFromPrevious),
                  formatPercent(step.conversionFromStart),
                ],
              })),
            }}
          >
            <FunnelChart steps={funnel.data?.steps ?? []} />
          </ChartCard>
        </PanelErrorBoundary>

        <PanelErrorBoundary label="Check-in trend">
          <ChartCard
            title="Check-in trend"
            description="Confirmed registrations compared with check-ins per day."
            loading={funnel.isLoading}
            empty={(funnel.data?.trend.length ?? 0) === 0}
            table={{
              caption: "Check-ins by day",
              columns: [
                { key: "day", label: "Day" },
                { key: "confirmed", label: "Confirmed", align: "right" },
                { key: "checked", label: "Checked in", align: "right" },
              ],
              rows: (funnel.data?.trend ?? []).map((point) => ({
                key: point.key,
                cells: [point.key, point.confirmed, point.checkedIn],
              })),
            }}
          >
            <CheckInTrendChart trend={funnel.data?.trend ?? []} />
          </ChartCard>
        </PanelErrorBoundary>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PanelErrorBoundary label="Capacity">
          <ChartCard
            title="Capacity utilisation"
            description="Events grouped by how full they are, for events that declare a capacity."
            loading={funnel.isLoading}
            empty={(funnel.data?.capacity.eventsWithCapacity ?? 0) === 0}
            emptyMessage="No filtered events declare a capacity."
            table={{
              caption: "Events by capacity utilisation",
              columns: [
                { key: "bucket", label: "Utilisation" },
                { key: "events", label: "Events", align: "right" },
              ],
              rows: (funnel.data?.capacity.buckets ?? []).map((bucket) => ({
                key: bucket.label,
                cells: [bucket.label, bucket.count],
              })),
            }}
          >
            <CapacityChart buckets={funnel.data?.capacity.buckets ?? []} />
          </ChartCard>
        </PanelErrorBoundary>

        <PanelErrorBoundary label="Retention">
          <ChartCard
            title="Cohort retention"
            description={cohorts.data?.definition ?? "New versus returning attendees per cohort month."}
            loading={cohorts.isLoading}
            empty={cohorts.data?.insufficient ?? (cohorts.data?.cohorts.length ?? 0) === 0}
            emptyMessage={cohorts.data?.minimumRequirement ?? "Not enough data yet."}
            table={{
              caption: "New and returning attendees by cohort month",
              columns: [
                { key: "month", label: "Cohort" },
                { key: "new", label: "New", align: "right" },
                { key: "returning", label: "Returning", align: "right" },
                { key: "total", label: "Total", align: "right" },
              ],
              rows: (cohorts.data?.cohorts ?? []).map((cohort: CohortRow) => ({
                key: cohort.key,
                cells: [cohort.key, cohort.newCount, cohort.returningCount, cohort.total],
              })),
            }}
          >
            <CohortChart cohorts={cohorts.data?.cohorts ?? []} />
          </ChartCard>
        </PanelErrorBoundary>
      </div>

      <PanelErrorBoundary label="Heatmap">
        <ChartCard
          title="When registrations happen"
          description="Registrations by local weekday and hour in the platform timezone."
          loading={heatmap.isLoading}
          empty={heatmap.data?.total === 0}
          emptyMessage="No registrations in this window."
          table={{
            caption: "Registrations by weekday and hour",
            columns: [
              { key: "weekday", label: "Day" },
              ...Array.from({ length: 24 }, (_, hour) => ({
                key: `h${hour}`,
                label: `${hour}:00`,
                align: "right" as const,
              })),
            ],
            rows: (heatmap.data?.weekdays ?? []).map((weekday, row) => ({
              key: weekday,
              cells: [
                weekday,
                ...(heatmap.data?.matrix[row] ?? []).map((value) => value),
              ],
            })),
          }}
        >
          {heatmap.data && (
            <HeatmapChart
              weekdays={heatmap.data.weekdays}
              hours={heatmap.data.hours}
              matrix={heatmap.data.matrix}
              max={heatmap.data.max}
              timezone={heatmap.data.timezone}
            />
          )}
        </ChartCard>
      </PanelErrorBoundary>

      <div className="grid gap-4 xl:grid-cols-2">
        {[
          { title: "By category", data: categoryBreakdown },
          { title: "By country", data: countryBreakdown },
          { title: "By city", data: cityBreakdown },
          { title: "By ticket type", data: ticketBreakdown },
        ].map(({ title, data }) => (
          <PanelErrorBoundary key={title} label={title}>
            <ChartCard
              title={title}
              description="Registrations grouped through their event."
              loading={data.isLoading}
              empty={(data.data?.rows.length ?? 0) === 0}
              table={{
                caption: `${title} breakdown`,
                columns: [
                  { key: "label", label: "Value" },
                  { key: "count", label: "Registrations", align: "right" },
                ],
                rows: ((data.data?.rows ?? []) as BreakdownRow[]).map((row) => ({
                  key: row.key,
                  cells: [row.label, row.value],
                })),
              }}
            >
              <BreakdownChart rows={(data.data?.rows ?? []) as BreakdownRow[]} />
            </ChartCard>
          </PanelErrorBoundary>
        ))}
      </div>
    </div>
  );
}
