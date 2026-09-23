"use client";

import { useState } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  TrendingUp,
  Clock,
  Trash2,
  QrCode,
  Loader2,
  CheckCircle,
  Download,
  Search,
  Eye,
  UserX,
} from "lucide-react";
import { useConvexQuery, useConvexMutation } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getCategoryIcon, getCategoryLabel } from "@/lib/data";
import QRScannerModal from "../_components/qr-scanner-modal";
import { AttendeeCard } from "../_components/attendee-card";
import { Id } from "@/convex/_generated/dataModel";

export default function EventDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as Id<"events">;

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Fetch event dashboard data
  const { data: dashboardData, isLoading } = useConvexQuery(
    api.dashboard.getEventDashboard,
    { eventId }
  );

  // Fetch registrations
  const { data: registrations, isLoading: loadingRegistrations } =
    useConvexQuery(api.registrations.getEventRegistrations, { eventId });

  // Delete event mutation
  const { mutate: deleteEvent, isLoading: isDeleting } = useConvexMutation(
    api.events.deleteEvent
  );

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this event? This action cannot be undone and will permanently delete the event and all associated registrations."
    );

    if (!confirmed) return;

    try {
      await deleteEvent({ eventId });
      toast.success("Event deleted successfully");
      router.push("/my-events");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete event";
      toast.error(errorMessage);
    }
  };

  const handleExportCSV = () => {
    if (!registrations || registrations.length === 0) {
      toast.error("No registrations to export");
      return;
    }

    const csvContent = [
      [
        "Name",
        "Email",
        "Registered At",
        "Checked In",
        "Checked In At",
        "QR Code",
      ],
      ...registrations.map((reg) => [
        reg.attendeeName,
        reg.attendeeEmail,
        new Date(reg.registeredAt).toLocaleString(),
        reg.checkedIn ? "Yes" : "No",
        reg.checkedInAt ? new Date(reg.checkedInAt).toLocaleString() : "-",
        reg.qrCode,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dashboardData?.event.title || "event"}_registrations.csv`;
    a.click();
    toast.success("CSV exported successfully");
  };

  if (isLoading || loadingRegistrations) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!dashboardData) {
    notFound();
  }

  const { event, stats } = dashboardData;

  // Filter registrations based on active tab and search
  const filteredRegistrations = registrations?.filter((reg) => {
    const matchesSearch =
      reg.attendeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.attendeeEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.qrCode.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "all") return matchesSearch && reg.status === "confirmed";
    if (activeTab === "checked-in")
      return matchesSearch && reg.checkedIn && reg.status === "confirmed";
    if (activeTab === "pending")
      return matchesSearch && !reg.checkedIn && reg.status === "confirmed";

    return matchesSearch;
  });

  return (
    <div className="min-h-screen pb-20 px-4 pt-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation */}
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push("/my-events")}
            className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Events
          </Button>
        </div>

        {/* Event Banner */}
        {event.coverImage && (
          <div className="relative h-[280px] md:h-[350px] w-full rounded-2xl overflow-hidden border border-border/40 shadow-sm">
            <Image
              src={event.coverImage}
              alt={event.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Event Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="secondary" className="px-2.5 py-0.5">
                {getCategoryIcon(event.category)}{" "}
                {getCategoryLabel(event.category)}
              </Badge>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{format(event.startDate, "PPP")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>
                  {event.locationType === "online"
                    ? "Online"
                    : `${event.city}, ${event.state || event.country}`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/events/${event.slug}`)}
              className="gap-2 flex-1 sm:flex-none"
            >
              <Eye className="w-4 h-4" />
              View Event
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-2 flex-1 sm:flex-none"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>

        {/* Quick Actions - Show QR Scanner if event is today */}
        {stats.isEventToday && !stats.isEventPast && (
          <Button
            size="lg"
            className="w-full gap-2 h-12 text-base font-semibold bg-gradient-to-r from-orange-500 via-pink-500 to-red-500 text-white shadow-md hover:opacity-95 transition-all"
            onClick={() => setShowQRScanner(true)}
          >
            <QrCode className="w-5 h-5" />
            Scan QR Code to Check-In
          </Button>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">
                  {stats.totalRegistrations}/{stats.capacity}
                </p>
                <p className="text-xs text-muted-foreground">Capacity</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">
                  {stats.checkedInCount}
                </p>
                <p className="text-xs text-muted-foreground">Checked In</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">
                  {event.ticketType === "paid"
                    ? `₹${stats.totalRevenue}`
                    : `${stats.checkInRate}%`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {event.ticketType === "paid" ? "Revenue" : "Check-in Rate"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">
                  {stats.isEventPast
                    ? "Ended"
                    : stats.hoursUntilEvent > 24
                      ? `${Math.floor(stats.hoursUntilEvent / 24)}d`
                      : `${stats.hoursUntilEvent}h`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.isEventPast ? "Event Over" : "Time Left"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendee Management Block */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Attendee Management
              </h2>
              <p className="text-sm text-muted-foreground">
                View and manage attendee registrations for this event.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-2 shrink-0 self-start sm:self-center"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full block space-y-4"
          >
            {/* Filter controls bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <TabsList className="grid grid-cols-3 w-full sm:w-[360px] h-10">
                <TabsTrigger value="all" className="text-xs">
                  All ({stats.totalRegistrations})
                </TabsTrigger>
                <TabsTrigger value="checked-in" className="text-xs">
                  Checked In ({stats.checkedInCount})
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs">
                  Pending ({stats.pendingCount})
                </TabsTrigger>
              </TabsList>

              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, or QR code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 text-xs"
                />
              </div>
            </div>

            {/* Content area */}
            <TabsContent value={activeTab} className="mt-0 space-y-3">
              {filteredRegistrations && filteredRegistrations.length > 0 ? (
                filteredRegistrations.map((registration) => (
                  <AttendeeCard
                    key={registration._id}
                    registration={registration}
                  />
                ))
              ) : (
                <Card className="border-dashed border-border/60 bg-card/30">
                  <CardContent className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                      <UserX className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-base">No attendees found</p>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your search terms or active status filter.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScannerModal
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
}