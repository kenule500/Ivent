"use client";

import { useConvexQuery } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Calendar,
  Ticket,
  DollarSign,
  TrendingUp,
  Loader2,
  ArrowUpRight,
} from "lucide-react";

export function AnalyticsSummary() {
  const { data: stats, isLoading } = useConvexQuery(
    api.analytics.getSummaryMetrics
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  const cards = [
    {
      label: "Total Users",
      value: stats?.totalUsers ?? 0,
      delta: `+${stats?.newUsers7d ?? 0} this week`,
      icon: Users,
      color: "text-blue-500",
    },
    {
      label: "Total Events",
      value: stats?.totalEvents ?? 0,
      delta: `${stats?.upcomingEvents ?? 0} upcoming`,
      icon: Calendar,
      color: "text-purple-500",
    },
    {
      label: "Registrations",
      value: stats?.totalRegistrations ?? 0,
      delta: `+${stats?.regs7d ?? 0} this week`,
      icon: Ticket,
      color: "text-green-500",
    },
    {
      label: "Revenue (est.)",
      value: `₦${(stats?.totalRevenue ?? 0).toLocaleString()}`,
      delta: "Paid tickets only",
      icon: DollarSign,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </p>
                <p className="text-3xl font-bold mt-2">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-green-500" />
                  {card.delta}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}