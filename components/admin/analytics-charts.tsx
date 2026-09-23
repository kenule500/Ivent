"use client";

import { useConvexQuery } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Loader2, TrendingUp, Users, Ticket, MapPin } from "lucide-react";

// ============ GROWTH CHART (Users + Registrations over time) ============

export function GrowthChart() {
  const { data: userGrowth, isLoading: loadingUsers } = useConvexQuery(
    api.analytics.getUserGrowth,
    { days: 30 }
  );
  const { data: regTrend, isLoading: loadingRegs } = useConvexQuery(
    api.analytics.getRegistrationTrend,
    { days: 30 }
  );

  if (loadingUsers || loadingRegs) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[350px]">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </CardContent>
      </Card>
    );
  }

  // Merge by date
  const merged =
    userGrowth?.map((u, i) => ({
      date: u.date,
      users: u.count,
      registrations: regTrend?.[i]?.count ?? 0,
    })) ?? [];

  const config: ChartConfig = {
    users: { label: "New Users", color: "hsl(217, 91%, 60%)" },
    registrations: {
      label: "Registrations",
      color: "hsl(142, 71%, 45%)",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-500" />
          Growth (Last 30 Days)
        </CardTitle>
        <CardDescription>New users and registrations per day</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[300px] w-full">
          <AreaChart data={merged}>
            <defs>
              <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-users)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-users)"
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient
                id="fillRegistrations"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-registrations)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-registrations)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => format(new Date(v), "MMM d")}
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(v) => format(new Date(v), "PPP")}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="users"
              stroke="var(--color-users)"
              fill="url(#fillUsers)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="registrations"
              stroke="var(--color-registrations)"
              fill="url(#fillRegistrations)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// ============ CATEGORY PIE CHART ============

const CATEGORY_COLORS = [
  "hsl(262, 83%, 58%)",
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(199, 89%, 48%)",
  "hsl(280, 65%, 60%)",
  "hsl(340, 82%, 52%)",
];

export function CategoryChart() {
  const { data: categories, isLoading } = useConvexQuery(
    api.analytics.getEventsByCategory
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[350px]">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </CardContent>
      </Card>
    );
  }

  const chartData =
    categories?.map((c, i) => ({
      category: c.category,
      count: c.count,
      fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    })) ?? [];

  const config: ChartConfig = chartData.reduce((acc, item) => {
    acc[item.category] = { label: item.category, color: item.fill };
    return acc;
  }, {} as ChartConfig);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-purple-500" />
          Events by Category
        </CardTitle>
        <CardDescription>Distribution across categories</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[300px] w-full">
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent nameKey="category" />}
            />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={50}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4">
          {chartData.slice(0, 8).map((item) => (
            <div key={item.category} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-sm capitalize">
                {item.category} ({item.count})
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============ CITY CHART ============

export function CityChart() {
  const { data: cities, isLoading } = useConvexQuery(
    api.analytics.getEventsByCity,
    { limit: 8 }
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[350px]">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </CardContent>
      </Card>
    );
  }

  const config: ChartConfig = {
    count: { label: "Events", color: "hsl(262, 83%, 58%)" },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-purple-500" />
          Events by City
        </CardTitle>
        <CardDescription>Top locations</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[300px] w-full">
          <BarChart
            data={cities}
            layout="vertical"
            margin={{ left: 20, right: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis
              dataKey="city"
              type="category"
              tick={{ fontSize: 12 }}
              width={100}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={[0, 6, 6, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// ============ TOP EVENTS ============

export function TopEvents() {
  const { data: events, isLoading } = useConvexQuery(
    api.analytics.getTopEvents,
    { limit: 5 }
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[350px]">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-500" />
          Top Events
        </CardTitle>
        <CardDescription>By registration count</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events?.map((event, index) => {
            const rate =
              event.capacity > 0
                ? Math.round((event.registrationCount / event.capacity) * 100)
                : 0;

            return (
              <div
                key={event._id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    index === 0
                      ? "bg-yellow-500/20 text-yellow-500"
                      : index === 1
                        ? "bg-gray-400/20 text-gray-400"
                        : index === 2
                          ? "bg-orange-700/20 text-orange-700"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.city}, {event.state} • {event.category}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{event.registrationCount}</p>
                  <p className="text-xs text-muted-foreground">{rate}% full</p>
                </div>
              </div>
            );
          })}
          {!events || events.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No events yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}