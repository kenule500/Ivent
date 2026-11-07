"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CalendarCheck,
  Clock,
  MailWarning,
  MessageSquare,
  TicketCheck,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { useConvexQuery } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/admin/page-header";
import { PanelErrorBoundary, PanelState } from "@/components/admin/panel-state";
import { TrendCard } from "@/components/admin/trend-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from "@/lib/format";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

const WINDOW_DAYS = 30;

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="What changed and what needs attention today."
        breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Dashboard" }]}
      />

      <PanelErrorBoundary label="Trends">
        <TrendsPanel />
      </PanelErrorBoundary>

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelErrorBoundary label="Action queue">
          <ActionQueuePanel />
        </PanelErrorBoundary>
        <PanelErrorBoundary label="Today">
          <TodayPanel />
        </PanelErrorBoundary>
      </div>

      <PanelErrorBoundary label="Recent audit activity">
        <RecentAuditPanel />
      </PanelErrorBoundary>
    </div>
  );
}

function TrendsPanel() {
  const { currency, timezone } = usePlatformSettings();
  const { data, isLoading } = useConvexQuery(api.commandCenter.getTrends, {
    days: WINDOW_DAYS,
  });

  const windowLabel = `last ${WINDOW_DAYS} days`;

  return (
    <PanelState loading={isLoading} skeletonRows={5}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TrendCard
          label="New users"
          current={data?.metrics.users.current ?? 0}
          previous={data?.metrics.users.previous ?? 0}
          sparkline={data?.metrics.users.sparkline ?? []}
          windowLabel={windowLabel}
          formatValue={(value) => formatNumber(value)}
          icon={UserPlus}
          color="text-blue-500"
        />
        <TrendCard
          label="New events"
          current={data?.metrics.events.current ?? 0}
          previous={data?.metrics.events.previous ?? 0}
          sparkline={data?.metrics.events.sparkline ?? []}
          windowLabel={windowLabel}
          formatValue={(value) => formatNumber(value)}
          icon={Calendar}
          color="text-purple-500"
        />
        <TrendCard
          label="Registrations"
          current={data?.metrics.registrations.current ?? 0}
          previous={data?.metrics.registrations.previous ?? 0}
          sparkline={data?.metrics.registrations.sparkline ?? []}
          windowLabel={windowLabel}
          formatValue={(value) => formatNumber(value)}
          icon={TicketCheck}
          color="text-emerald-500"
        />
        <TrendCard
          label="Estimated revenue"
          current={data?.metrics.revenue.current ?? 0}
          previous={data?.metrics.revenue.previous ?? 0}
          sparkline={data?.metrics.revenue.sparkline ?? []}
          windowLabel={windowLabel}
          formatValue={(value) =>
            formatCurrency(value, {
              currency,
              locale: undefined,
            })
          }
          icon={TrendingUp}
          color="text-orange-500"
        />
      </div>
      {data && (
        <p className="mt-2 text-[0.7rem] text-muted-foreground">
          As of {formatDateTime(data.asOf, { currency, timezone })}
        </p>
      )}
    </PanelState>
  );
}

const QUEUE_META = [
  {
    key: "expiringInvites" as const,
    label: "Invites expiring in 48h",
    icon: Clock,
    href: "/admin/invites",
  },
  {
    key: "atCapacity" as const,
    label: "Events at capacity",
    icon: Users,
    href: "/admin/events",
  },
  {
    key: "staleFeedback" as const,
    label: "Feedback open over 48h",
    icon: MessageSquare,
    href: "/admin/feedback",
  },
  {
    key: "failedEmails" as const,
    label: "Failed emails (24h)",
    icon: MailWarning,
    href: "/admin/health",
  },
];

function ActionQueuePanel() {
  const { data, isLoading } = useConvexQuery(api.commandCenter.getActionQueue, {});
  const total = data
    ? Object.values(data.queues).reduce((sum, queue) => sum + queue.count, 0)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertTriangle className="size-4 text-orange-500" aria-hidden="true" />
          Action queue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PanelState
          loading={isLoading}
          skeletonRows={4}
          empty={!isLoading && total === 0}
          emptyTitle="Nothing needs attention"
          emptyDescription="No expiring invites, full events, stale feedback, or failed emails."
        >
          <ul className="space-y-3">
            {QUEUE_META.map((meta) => {
              const queue = data?.queues[meta.key];
              const Icon = meta.icon;
              return (
                <li key={meta.key}>
                  <Link
                    href={meta.href}
                    className="flex items-start justify-between gap-3 rounded-lg px-1 py-1.5 hover:bg-muted/60"
                  >
                    <span className="flex min-w-0 items-start gap-2">
                      <Icon
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{meta.label}</span>
                        {queue && queue.previews.length > 0 ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {queue.previews.map((preview) => preview.label).join(" · ")}
                          </span>
                        ) : (
                          <span className="block text-xs text-muted-foreground">
                            Nothing pending
                          </span>
                        )}
                      </span>
                    </span>
                    <Badge variant={queue && queue.count > 0 ? "default" : "secondary"}>
                      {queue?.count ?? 0}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </PanelState>
      </CardContent>
    </Card>
  );
}

function TodayPanel() {
  const { data, isLoading } = useConvexQuery(api.commandCenter.getToday, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <CalendarCheck className="size-4 text-emerald-500" aria-hidden="true" />
          Today
          {data && (
            <span className="font-normal text-muted-foreground">({data.timezone})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PanelState
          loading={isLoading}
          skeletonRows={3}
          empty={!isLoading && (data?.events.length ?? 0) === 0}
          emptyTitle="No events today"
          emptyDescription="Nothing is scheduled in the platform timezone today."
        >
          <ul className="space-y-3">
            {data?.events.map((event) => (
              <li key={event.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium">{event.title}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {event.checkedIn}/{event.confirmed} checked in
                  </span>
                </div>
                <Progress value={Math.round(event.rate * 100)} aria-label="Check-in progress" />
                <p className="text-[0.7rem] text-muted-foreground">
                  {event.city ? `${event.city} · ` : ""}
                  {formatPercent(event.rate)} check-in rate
                </p>
              </li>
            ))}
          </ul>
        </PanelState>
      </CardContent>
    </Card>
  );
}

function RecentAuditPanel() {
  const { data, isLoading } = useConvexQuery(api.admin.getRecentAudit, { limit: 10 });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Recent admin activity</CardTitle>
      </CardHeader>
      <CardContent>
        <PanelState
          loading={isLoading}
          skeletonRows={5}
          empty={!isLoading && (data?.length ?? 0) === 0}
          emptyTitle="No admin activity yet"
          emptyDescription="Administrative actions will appear here as they happen."
        >
          <ul className="divide-y">
            {data?.map((entry) => (
              <li key={entry._id} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    <span className="font-medium">{entry.actorName}</span>{" "}
                    <span className="text-muted-foreground">{entry.action}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.targetLabel}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </PanelState>
      </CardContent>
    </Card>
  );
}
