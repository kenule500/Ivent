// app/admin/dashboard/page.tsx
"use client";

import { useConvexQuery } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Users, Calendar, Ticket, TrendingUp, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const router = useRouter();
  const { data: stats, isLoading, error } = useConvexQuery(api.admin.getDashboardStats);

  // If there's an error (not admin), redirect to login
  useEffect(() => {
    if (!isLoading && error) {
      router.push("/admin");
    }
  }, [isLoading, error, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">You don&rsquo;t have admin permissions.</p>
          <Button onClick={() => router.push("/admin")}>
            Go to Admin Login
          </Button>
        </div>
      </div>
    );
  }

  const statCards = [
    { 
      label: "Total Users", 
      value: stats?.totalUsers ?? 0, 
      icon: Users, 
      color: "text-blue-500",
      href: "/admin/users"
    },
    { 
      label: "Total Events", 
      value: stats?.totalEvents ?? 0, 
      icon: Calendar, 
      color: "text-purple-500",
      href: "/admin/events"
    },
    { 
      label: "Total Registrations", 
      value: stats?.totalRegistrations ?? 0, 
      icon: Ticket, 
      color: "text-green-500",
      href: "/admin/registrations"
    },
    { 
      label: "Upcoming Events", 
      value: stats?.upcomingEvents ?? 0, 
      icon: TrendingUp, 
      color: "text-orange-500",
      href: "/admin/events"
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="p-6 bg-card rounded-lg border hover:border-purple-500/30 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-4">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-3xl font-bold">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-card rounded-lg border">
          <h3 className="font-semibold mb-4">Recent Users</h3>
          <RecentUsers />
        </div>
        <div className="p-6 bg-card rounded-lg border">
          <h3 className="font-semibold mb-4">Recent Events</h3>
          <RecentEvents />
        </div>
      </div>
    </div>
  );
}

function RecentUsers() {
  const { data: users } = useConvexQuery(api.admin.getAllUsers, { limit: 5 });
  
  return (
    <div className="space-y-3">
      {users?.map((user) => (
        <div key={user._id} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              {user.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          {user.role === "admin" && (
            <span className="text-xs bg-purple-500/10 text-purple-500 px-2 py-1 rounded">
              Admin
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function RecentEvents() {
  const { data: events } = useConvexQuery(api.admin.getAllEvents, { limit: 5 });
  
  return (
    <div className="space-y-3">
      {events?.map((event) => (
        <div key={event._id} className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{event.title}</p>
            <p className="text-xs text-muted-foreground">
              {event.city}, {event.state}
            </p>
          </div>
          <span className="text-xs bg-muted px-2 py-1 rounded shrink-0">
            {event.registrationCount}/{event.capacity}
          </span>
        </div>
      ))}
    </div>
  );
}