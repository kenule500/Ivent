"use client";

import { useState, useMemo, useEffect } from "react";
import { useConvexQuery } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Ticket, TrendingUp } from "lucide-react";
import { StatCard, EventsTable } from "@/components/admin";
import { PageHeader } from "@/components/admin/page-header";
import { ExportButton } from "@/components/admin/export-button";

export default function AdminEventsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Use useState initializer to store the timestamp once
  const [now] = useState(() => Date.now());
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [search]);
  
  // Get events based on debounced search
  const { data: events } = useConvexQuery(api.admin.getAllEvents, {
    search: debouncedSearch || undefined,
    limit: 100,
  });

  // Use useMemo to calculate derived values with the stored timestamp
  const stats = useMemo(() => {
    const totalEvents = events?.length ?? 0;
    const upcomingEvents = events?.filter((e) => e.startDate > now).length ?? 0;
    const totalRegistrations = events?.reduce((sum, e) => sum + e.registrationCount, 0) ?? 0;
    
    return { totalEvents, upcomingEvents, totalRegistrations };
  }, [events, now]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Event Management"
        description="Manage all platform events."
        breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Events" }]}
        actions={<ExportButton module="events" search={search || undefined} />}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Total Events"
          value={stats.totalEvents}
          icon={Calendar}
          color="text-purple-500"
          description="All events on platform"
        />
        <StatCard
          label="Upcoming Events"
          value={stats.upcomingEvents}
          icon={TrendingUp}
          color="text-green-500"
          description="Events starting in the future"
        />
        <StatCard
          label="Total Registrations"
          value={stats.totalRegistrations}
          icon={Ticket}
          color="text-orange-500"
          description="Across all events"
        />
      </div>

      {/* Search Bar */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search events by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
      </div>

      {/* Events Table */}
      <EventsTable search={debouncedSearch} />
    </div>
  );
}