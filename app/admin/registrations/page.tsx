"use client";

import { useState, useMemo } from "react";
import { useConvexQuery, useConvexMutation } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  Users,
  Loader2,
  Calendar,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Id } from "@/convex/_generated/dataModel";
import { CancelRegistrationModal } from "@/components/admin/cancel-registration-modal";
import { Pagination } from "@/components/admin/pagination";
import { PageHeader } from "@/components/admin/page-header";

const ITEMS_PER_PAGE = 10;

export default function AdminRegistrationsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [prevSearch, setPrevSearch] = useState(search);
  const [prevStatus, setPrevStatus] = useState(statusFilter);

  // Reset to page 1 when filters change
  if (search !== prevSearch || statusFilter !== prevStatus) {
    setPrevSearch(search);
    setPrevStatus(statusFilter);
    setCurrentPage(1);
  }

  const [registrationToCancel, setRegistrationToCancel] = useState<{
    id: Id<"registrations">;
    attendeeName: string;
    eventTitle: string;
  } | null>(null);

  const { data: registrations, isLoading } = useConvexQuery(
    api.admin.getAllRegistrations,
    { limit: 500 }
  );

  const { data: events } = useConvexQuery(api.admin.getAllEvents, {
    limit: 500,
  });

  const { mutate: cancelRegistration, isLoading: cancelling } =
    useConvexMutation(api.registrations.cancelRegistration);

  const getEventName = (eventId: Id<"events">) => {
    return events?.find((e) => e._id === eventId)?.title || "Unknown Event";
  };

  // Filter registrations
  const filteredRegistrations = registrations?.filter((reg) => {
    if (search) {
      const searchLower = search.toLowerCase();
      const eventTitle = getEventName(reg.eventId).toLowerCase();
      const matchesSearch =
        reg.attendeeName.toLowerCase().includes(searchLower) ||
        reg.attendeeEmail.toLowerCase().includes(searchLower) ||
        reg.qrCode.toLowerCase().includes(searchLower) ||
        eventTitle.includes(searchLower);
      if (!matchesSearch) return false;
    }

    if (statusFilter !== "all" && reg.status !== statusFilter) {
      return false;
    }

    return true;
  });

  // Pagination
  const totalItems = filteredRegistrations?.length ?? 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const paginatedRegistrations = useMemo(() => {
    if (!filteredRegistrations) return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRegistrations.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRegistrations, currentPage]);

  const handleCancelClick = (reg: {
    _id: Id<"registrations">;
    attendeeName: string;
    eventId: Id<"events">;
  }) => {
    setRegistrationToCancel({
      id: reg._id,
      attendeeName: reg.attendeeName,
      eventTitle: getEventName(reg.eventId),
    });
  };

  const handleConfirmCancel = async () => {
    if (!registrationToCancel) return;

    try {
      await cancelRegistration({ registrationId: registrationToCancel.id });
      toast.success("Registration cancelled successfully");
      setRegistrationToCancel(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to cancel registration";
      toast.error(errorMessage);
    }
  };

  const handleExport = () => {
    if (!filteredRegistrations) return;

    const header = [
      "Attendee Name",
      "Attendee Email",
      "Event",
      "Status",
      "QR Code",
      "Registered At",
      "Checked In",
    ].join(",");

    const rows = filteredRegistrations.map((reg) =>
      [
        reg.attendeeName,
        reg.attendeeEmail,
        events?.find((e) => e._id === reg.eventId)?.title || "Unknown",
        reg.status,
        reg.qrCode,
        new Date(reg.registeredAt).toLocaleString(),
        reg.checkedIn ? "Yes" : "No",
      ].join(",")
    );

    const csvContent = [header, ...rows].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const hasActiveFilters = search || statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Registrations"
          description="Manage all event registrations across the platform."
          breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Registrations" }]}
          actions={
            <Button onClick={handleExport} className="gap-2 shrink-0">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Total Registrations"
            value={registrations?.length ?? 0}
            icon={Users}
            color="text-blue-500"
          />
          <StatCard
            label="Confirmed"
            value={
              registrations?.filter((r) => r.status === "confirmed").length ?? 0
            }
            icon={CheckCircle2}
            color="text-green-500"
          />
          <StatCard
            label="Cancelled"
            value={
              registrations?.filter((r) => r.status === "cancelled").length ?? 0
            }
            icon={XCircle}
            color="text-red-500"
          />
          <StatCard
            label="Checked In"
            value={registrations?.filter((r) => r.checkedIn).length ?? 0}
            icon={CheckCircle2}
            color="text-purple-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search attendee, email, event, or QR code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-muted rounded"
                aria-label="Clear search"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value || "all")}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="gap-2 shrink-0"
            >
              <X className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Registrations</CardTitle>
            <CardDescription>
              Showing {paginatedRegistrations.length} of {totalItems} registrations
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attendee</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>QR Code</TableHead>
                    <TableHead>Registered At</TableHead>
                    <TableHead>Checked In</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRegistrations.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-12 text-muted-foreground"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Calendar className="w-12 h-12 text-muted-foreground" />
                          <p>No registrations found</p>
                          {search && (
                            <p className="text-sm">
                              No results for &ldquo;{search}&rdquo;
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRegistrations.map((reg) => (
                      <TableRow key={reg._id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium whitespace-nowrap">
                              {reg.attendeeName}
                            </span>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {reg.attendeeEmail}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm whitespace-nowrap">
                            {getEventName(reg.eventId)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              reg.status === "confirmed"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {reg.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded whitespace-nowrap">
                            {reg.qrCode}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm whitespace-nowrap">
                            {format(reg.registeredAt, "MMM dd, yyyy HH:mm")}
                          </span>
                        </TableCell>
                        <TableCell>
                          {reg.checkedIn ? (
                            <Badge
                              variant="secondary"
                              className="bg-green-500/10 text-green-500 whitespace-nowrap"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {reg.status === "confirmed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelClick(reg)}
                              disabled={cancelling}
                              className="text-red-500 hover:text-red-700 hover:bg-red-500/10 whitespace-nowrap"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="hidden sm:inline ml-1">
                                Cancel
                              </span>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </CardContent>
        </Card>
      </div>

      {/* Cancel Modal */}
      <CancelRegistrationModal
        isOpen={!!registrationToCancel}
        onClose={() => setRegistrationToCancel(null)}
        onConfirm={handleConfirmCancel}
        attendeeName={registrationToCancel?.attendeeName || ""}
        eventTitle={registrationToCancel?.eventTitle || ""}
        isLoading={cancelling}
      />
    </>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="p-3 sm:p-4 lg:p-6 bg-card rounded-lg border">
      <div className="flex items-center gap-2.5 sm:gap-3 lg:gap-4">
        <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
        </div>
        <div className="min-w-0">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold leading-tight">
            {value}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground leading-tight">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}