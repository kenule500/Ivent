"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexQuery } from "@/hooks/useConvexQuery";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { PageHeader } from "@/components/admin/page-header";
import { PanelErrorBoundary, PanelState } from "@/components/admin/panel-state";
import { ChartCard } from "@/components/admin/chart-card";
import { ExportButton } from "@/components/admin/export-button";
import { CheckInTrendChart } from "@/components/admin/analytics-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "@/lib/format";

export default function EventReportPage() {
  const { currency: CURRENCY } = usePlatformSettings();
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId;
  const { data, isLoading } = useConvexQuery(
    api.reports.getEventReport,
    eventId ? { eventId: eventId as Id<"events"> } : "skip"
  );

  return (
    <div className="report-page space-y-6">
      <div className="no-print">
        <PageHeader
          title="Event report"
          description="Attendance, check-in, capacity, and revenue for a single event."
          breadcrumb={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "Reports", href: "/admin/reports" },
            { label: "Event report" },
          ]}
          actions={
            <>
              <Button variant="ghost" render={<Link href="/admin/reports" />}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                All reports
              </Button>
              {data && (
                <ExportButton
                  module="report"
                  eventId={data.event.id}
                  label="Export report CSV"
                />
              )}
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="size-4" aria-hidden="true" />
                Print / PDF
              </Button>
            </>
          }
        />
      </div>

      <PanelState loading={isLoading} skeletonRows={8}>
        {data && (
          <>
            <div className="report-masthead mb-4 hidden border-b pb-3 print:block">
              <p className="text-lg font-bold">Ivent</p>
              <h2 className="text-base font-semibold">{data.event.title}</h2>
              <p className="text-xs text-muted-foreground">
                {formatDate(data.event.startDate, {
                  currency: CURRENCY,
                  timezone: data.timezone,
                })}{" "}
                · {data.event.city ?? "No city"} · As of{" "}
                {formatDateTime(data.asOf, {
                  currency: CURRENCY,
                  timezone: data.timezone,
                })}{" "}
                ({data.timezone})
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">{data.event.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(data.event.startDate, {
                      currency: CURRENCY,
                      timezone: data.timezone,
                    })}
                    {data.event.city ? ` · ${data.event.city}` : ""}
                    {data.event.country ? `, ${data.event.country}` : ""} ·{" "}
                    {data.event.category}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Organizer: {data.event.organizer} · As of{" "}
                    {formatDateTime(data.asOf, {
                      currency: CURRENCY,
                      timezone: data.timezone,
                    })}{" "}
                    ({data.timezone})
                  </p>
                </div>
                <Badge variant={data.event.ticketType === "paid" ? "default" : "secondary"}>
                  {data.event.ticketType === "paid"
                    ? `Paid · ${formatCurrency(data.event.ticketPrice, { currency: CURRENCY })}`
                    : "Free"}
                </Badge>
              </div>
            </div>

            {data.attendance.registered === 0 ? (
              <Card>
                <CardContent className="space-y-1 p-6">
                  <p className="text-sm font-medium">No registrations yet</p>
                  <p className="text-sm text-muted-foreground">
                    This event has no registrations, so attendance, check-in, and
                    revenue are all zero. The figures appear here once people register.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {[
                    { label: "Registered", value: formatNumber(data.attendance.registered) },
                    { label: "Confirmed", value: formatNumber(data.attendance.confirmed) },
                    { label: "Checked in", value: formatNumber(data.attendance.checkedIn) },
                    { label: "No-show", value: formatNumber(data.attendance.noShow) },
                    { label: "Cancelled", value: formatNumber(data.attendance.cancelled) },
                    {
                      label: "Check-in rate",
                      value: formatPercent(data.attendance.checkInRate),
                    },
                    {
                      label: "Capacity used",
                      value:
                        data.attendance.capacityUtilisation === null
                          ? "No capacity"
                          : formatPercent(data.attendance.capacityUtilisation),
                    },
                    {
                      label: "Estimated revenue",
                      value: formatCurrency(data.revenue, { currency: CURRENCY }),
                    },
                  ].map((item) => (
                    <Card key={item.label}>
                      <CardContent className="space-y-1 p-4">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-xl font-bold">{item.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <PanelErrorBoundary label="Check-in series">
                  <ChartCard
                    title="Check-ins over time"
                    description="Check-ins per day in the platform timezone."
                    empty={data.trend.every((point) => point.checkedIn === 0)}
                    emptyMessage="No check-ins have been recorded yet."
                    table={{
                      caption: "Check-ins by day",
                      columns: [
                        { key: "day", label: "Day" },
                        { key: "checked", label: "Check-ins", align: "right" },
                      ],
                      rows: data.trend.map((point) => ({
                        key: point.key,
                        cells: [point.key, point.checkedIn],
                      })),
                    }}
                  >
                    <CheckInTrendChart
                      trend={data.trend.map((point) => ({
                        key: point.key,
                        confirmed: data.attendance.confirmed,
                        checkedIn: point.checkedIn,
                      }))}
                    />
                  </ChartCard>
                </PanelErrorBoundary>
              </>
            )}

            {data.registrationScanLimit <= 10_000 && (
              <p className="text-[0.7rem] text-muted-foreground">
                Report scans up to {formatNumber(data.registrationScanLimit)} registrations.
              </p>
            )}
          </>
        )}
      </PanelState>
    </div>
  );
}
