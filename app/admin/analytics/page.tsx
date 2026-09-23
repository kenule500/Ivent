"use client";

import { AnalyticsSummary } from "@/components/admin/analytics-summary";
import {
  GrowthChart,
  CategoryChart,
  CityChart,
  TopEvents,
} from "@/components/admin/analytics-charts";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Platform insights and growth metrics
        </p>
      </div>

      {/* Summary Cards */}
      <AnalyticsSummary />

      {/* Growth Chart (full width) */}
      <GrowthChart />

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryChart />
        <CityChart />
      </div>

      {/* Top Events */}
      <TopEvents />
    </div>
  );
}