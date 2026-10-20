"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HeartPulse,
  Mail,
  MessageSquare,
  Timer,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/hooks/useConvexQuery";
import { PageHeader } from "@/components/admin/page-header";
import { PanelErrorBoundary, PanelState } from "@/components/admin/panel-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDateTime,
  formatNumber,
  formatRelativeTime,
  DEFAULT_CURRENCY,
} from "@/lib/format";

export default function SystemHealthPage() {
  const { data, isLoading } = useConvexQuery(api.health.getOverview, {});

  const timezone = data?.timezone ?? "UTC";
  const asOf = data?.asOf;

  const config = data?.config;
  const configRows = [
    {
      label: "Resend API key",
      present: config?.resendApiKeyPresent ?? false,
      hint: "Required for invite and announcement email",
    },
    {
      label: "Resend from address",
      present: config?.resendFromAddressPresent ?? false,
      hint: "Falls back to the Resend test sender",
    },
    {
      label: "Site URL",
      present: config?.siteUrlPresent ?? false,
      hint: "Used to build links inside emails",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System health"
        description={`Operational signals with their measurement windows.${
          asOf
            ? ` As of ${formatDateTime(asOf, { currency: DEFAULT_CURRENCY, timezone })} (${timezone}).`
            : ""
        }`}
        breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "System health" }]}
      />

      <PanelState loading={isLoading} skeletonRows={10}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Timer className="size-4 text-blue-500" aria-hidden="true" />
                Scheduled jobs
                <span className="font-normal text-muted-foreground">
                  ({data?.windows.cron})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PanelErrorBoundary label="Scheduled jobs">
                <PanelState
                  skeletonRows={2}
                  empty={!isLoading && (data?.cron.jobs.length ?? 0) === 0}
                  emptyTitle="No cron heartbeat yet"
                  emptyDescription="A heartbeat appears after the daily job first runs."
                >
                  <ul className="space-y-3">
                    {data?.cron.jobs.map((job) => (
                      <li key={job.name} className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{job.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Last run {formatRelativeTime(job.lastRunAt)} ·{" "}
                            {formatNumber(job.processed)} processed
                          </p>
                          {job.error && (
                            <p className="truncate text-xs text-destructive">{job.error}</p>
                          )}
                        </div>
                        <Badge
                          variant={
                            job.stale || job.status === "failed" ? "destructive" : "secondary"
                          }
                        >
                          {job.stale ? "stale" : job.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[0.7rem] text-muted-foreground">
                    A job is stale after {data?.cron.staleAfterHours ?? 36} hours without a run.
                  </p>
                </PanelState>
              </PanelErrorBoundary>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Mail className="size-4 text-purple-500" aria-hidden="true" />
                Email delivery
                <span className="font-normal text-muted-foreground">
                  ({data?.windows.emails})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PanelErrorBoundary label="Email delivery">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Sent 24h", value: data?.email.sent24h ?? 0 },
                    { label: "Failed 24h", value: data?.email.failed24h ?? 0 },
                    { label: "Failed 7d", value: data?.email.failed7d ?? 0 },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg border p-2">
                      <p className="text-[0.65rem] text-muted-foreground">{stat.label}</p>
                      <p className="text-lg font-semibold">{formatNumber(stat.value)}</p>
                    </div>
                  ))}
                </div>

                {data?.email.lastFailureAt && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Last failure {formatRelativeTime(data.email.lastFailureAt)}
                  </p>
                )}

                {(data?.email.recentFailures.length ?? 0) > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {data?.email.recentFailures.map((failure) => (
                      <li
                        key={failure.id}
                        className="truncate text-xs text-muted-foreground"
                      >
                        <span className="text-destructive">{failure.template}</span> ·{" "}
                        {failure.recipient} · {failure.error}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-emerald-500" aria-hidden="true" />
                    No failed sends in the last 24 hours.
                  </p>
                )}
              </PanelErrorBoundary>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="size-4 text-orange-500" aria-hidden="true" />
                Rate limits
                <span className="font-normal text-muted-foreground">
                  ({data?.windows.rateLimits})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PanelErrorBoundary label="Rate limits">
                <p className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {formatNumber(data?.rateLimits.rejected24h ?? 0)}
                  </span>
                  <span className="text-xs text-muted-foreground">rejections in 24h</span>
                </p>
                {(data?.rateLimits.buckets.length ?? 0) > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {data?.rateLimits.buckets.map((bucket) => (
                      <li
                        key={bucket.bucket}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-muted-foreground">{bucket.bucket}</span>
                        <span className="font-medium">{formatNumber(bucket.count)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    No bucket has rejected a request in this window.
                  </p>
                )}
              </PanelErrorBoundary>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessageSquare className="size-4 text-emerald-500" aria-hidden="true" />
                Open feedback
                <span className="font-normal text-muted-foreground">
                  ({data?.windows.feedback})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PanelErrorBoundary label="Open feedback">
                <p className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {formatNumber(data?.feedback.open ?? 0)}
                  </span>
                  <span className="text-xs text-muted-foreground">open items</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data?.feedback.oldestOpenAt
                    ? `Oldest opened ${formatRelativeTime(data.feedback.oldestOpenAt)}.`
                    : "Nothing is waiting for triage."}
                </p>
              </PanelErrorBoundary>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <HeartPulse className="size-4 text-red-500" aria-hidden="true" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-3">
              {configRows.map((row) => (
                <li key={row.label} className="rounded-lg border p-3">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    {row.present ? (
                      <CheckCircle2 className="size-3.5 text-emerald-500" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="size-3.5 text-orange-500" aria-hidden="true" />
                    )}
                    {row.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.present ? "Configured" : "Not configured"} · {row.hint}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Announcement sending:{" "}
              <span className="font-medium">
                {data?.broadcastSendingEnabled ? "enabled" : "disabled until the sending domain is verified"}
              </span>
              . No secret values are shown here.
            </p>
          </CardContent>
        </Card>
      </PanelState>
    </div>
  );
}
