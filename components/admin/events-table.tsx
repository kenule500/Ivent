"use client";

import { useState } from "react";
import { useConvexQuery, useConvexMutation } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Trash2, Loader2, Calendar, Eye } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { Doc } from "@/convex/_generated/dataModel";
import { SmartImage } from "@/components/SmartImage";
import { EventDetailsModal } from "./event-details-modal";
import { Pagination } from "./pagination";
import { DeleteEventModal } from "./delete-event-modal";

const ITEMS_PER_PAGE = 10;

interface EventsTableProps {
  search?: string;
}

export function EventsTable({ search = "" }: EventsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [prevSearch, setPrevSearch] = useState(search);
  
  // Reset page during render if search changed (React's recommended pattern)
  if (search !== prevSearch) {
    setPrevSearch(search);
    setCurrentPage(1);
  }
  
  const { data: events, isLoading } = useConvexQuery(api.admin.getAllEvents, {
    search: search || undefined,
    limit: 100,
  });

  const { mutate: deleteEvent, isLoading: deleting } = useConvexMutation(
    api.admin.deleteEvent
  );

  // State for modals
  const [selectedEvent, setSelectedEvent] = useState<Doc<"events"> | null>(null);
  const [eventToDelete, setEventToDelete] = useState<{
    id: Id<"events">;
    title: string;
  } | null>(null);

  // Pagination
  const totalItems = events?.length ?? 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  
  const paginatedEvents = events?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  ) ?? [];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewDetails = (event: Doc<"events">) => {
    setSelectedEvent(event);
  };

  const handleDeleteClick = (eventId: Id<"events">, eventTitle: string) => {
    setEventToDelete({ id: eventId, title: eventTitle });
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    
    try {
      await deleteEvent({ eventId: eventToDelete.id });
      toast.success("Event deleted successfully");
      setEventToDelete(null);
      setSelectedEvent(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete event";
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
          <CardDescription>
            Showing {totalItems} event{totalItems !== 1 ? "s" : ""}
            {search && ` for "${search}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Organizer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Registrations</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEvents?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar className="w-12 h-12 text-muted-foreground" />
                        <p className="text-muted-foreground">No events found</p>
                        {search && (
                          <p className="text-sm text-muted-foreground">
                            No results for &rdquo;{search}&rdquo;
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEvents?.map((event) => (
                    <TableRow key={event._id}>
                      <TableCell>
                        <button
                          onClick={() => handleViewDetails(event)}
                          className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                        >
                          {event.coverImage && (
                            <SmartImage
                              src={event.coverImage}
                              alt={event.title}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <p className="font-medium hover:text-purple-500 transition-colors">
                              {event.title}
                            </p>
                            <Badge variant="secondary">{event.category}</Badge>
                          </div>
                        </button>
                      </TableCell>
                      <TableCell>{event.organizerName}</TableCell>
                      <TableCell>{format(event.startDate, "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        {event.city}, {event.state}
                      </TableCell>
                      <TableCell>
                        {event.registrationCount}/{event.capacity}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(event)}
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-500/10"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(event._id, event.title)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
                        </div>
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
            onPageChange={handlePageChange}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          event={selectedEvent}
          onDelete={handleDeleteClick}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteEventModal
        isOpen={!!eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleConfirmDelete}
        eventTitle={eventToDelete?.title || ""}
        isLoading={deleting}
      />
    </>
  );
}