"use client";

import { AnalyticsSummary } from "@/components/admin/analytics-summary";
import {
  GrowthChart,
  CategoryChart,
  CityChart,
  TopEvents,
} from "@/components/admin/analytics-charts";
import { PageHeader } from "@/components/admin/page-header";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Platform insights and growth metrics."
        breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Analytics" }]}
      />

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