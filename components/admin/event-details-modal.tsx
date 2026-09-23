"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Ticket,
  Users,
  Globe,
  DollarSign,
  Trash2,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { SmartImage } from "@/components/SmartImage";
import { Id } from "@/convex/_generated/dataModel";
import { Doc } from "@/convex/_generated/dataModel";
import { useConvexMutation } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Doc<"events">;
  onDelete?: (eventId: Id<"events">, eventTitle: string) => void;
}

export function EventDetailsModal({ isOpen, onClose, event, onDelete }: EventDetailsModalProps) {
  const [copied, setCopied] = useState(false);
  const [now] = useState(() => Date.now());
  const { mutate: deleteEvent, isLoading: deleting } = useConvexMutation(
    api.admin.deleteEvent
  );

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/events/${event._id}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Event link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(`Failed to copy link: ${error}`);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    onDelete(event._id, event.title);
  };

  const formatDate = (timestamp: number) => {
    return format(timestamp, "EEEE, MMMM do, yyyy");
  };

  const formatTime = (timestamp: number) => {
    return format(timestamp, "h:mm a");
  };

  const isPastEvent = event.endDate < now;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto p-0">
        {/* Cover Image */}
        {event.coverImage && (
          <div className="relative w-full h-64 overflow-hidden rounded-t-lg">
            <SmartImage
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover"
              width={800}
              height={400}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        <div className="p-6">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{event.category}</Badge>
                  {isPastEvent && (
                    <Badge variant="destructive">Past Event</Badge>
                  )}
                </div>
                <DialogTitle className="text-2xl font-bold">{event.title}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Organized by {event.organizerName}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </DialogHeader>

          <DialogDescription className="mt-4 space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">About This Event</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {event.description}
              </p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date & Time */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  Date & Time
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{formatDate(event.startDate)}</p>
                  <p className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(event.startDate)} - {formatTime(event.endDate)}
                  </p>
                  <p className="text-xs">{event.timezone}</p>
                </div>
              </div>

              {/* Location */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <MapPin className="w-4 h-4 text-purple-500" />
                  Location
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {event.locationType === "online" ? (
                    <p className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Online Event
                    </p>
                  ) : (
                    <>
                      {event.venue && <p>{event.venue}</p>}
                      {event.address && <p>{event.address}</p>}
                      <p>
                        {event.city}, {event.state}, {event.country}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Capacity & Registrations */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  Capacity
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    {event.registrationCount} / {event.capacity} registered
                  </p>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{
                        width: `${Math.min((event.registrationCount / event.capacity) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Tickets */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Ticket className="w-4 h-4 text-purple-500" />
                  Tickets
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {event.ticketType === "free" ? (
                    <p>Free Entry</p>
                  ) : (
                    <p className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {event.ticketPrice} per ticket
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Organizer Info */}
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Organizer</p>
                  <p className="text-sm text-muted-foreground">{event.organizerName}</p>
                </div>
              </div>
            </div>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </DialogDescription>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
                className="gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Event
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}