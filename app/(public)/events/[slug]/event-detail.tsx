/* eslint-disable react-hooks/purity */
"use client";

import { useParams, useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Share2,
  Ticket,
  ExternalLink,
  Flag,
  CheckCircle,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventSkeleton } from "@/components/skeletons/event-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCategoryIcon, getCategoryLabel } from "@/lib/data";
import dynamic from "next/dynamic";
import { useConvexQuery } from "@/hooks/useConvexQuery";
import { useI18n } from "@/components/locale-provider";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SponsorStrip } from "./_components/sponsor-strip";
import {
  formatEventDateRange,
  formatEventLocation,
  formatEventPrice,
  formatEventTimeRange,
} from "@/lib/event-format";

// The registration modal is an interaction, not first paint. Loading it lazily
// keeps the dialog, form, and its Clerk/Convex wiring out of the event page's
// first-load bundle (T4.3, NFR-003).
const RegisterModal = dynamic(() => import("./_components/register-modal"), {
  ssr: false,
});

// Utility function to darken a color
function darkenColor(color: string, amount: number) {
  const colorWithoutHash = color.replace("#", "");
  const num = parseInt(colorWithoutHash, 16);
  const r = Math.max(0, (num >> 16) - amount * 255);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount * 255);
  const b = Math.max(0, (num & 0x0000ff) - amount * 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const { t, locale } = useI18n();
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Fetch event details
  const { data: event, isLoading } = useConvexQuery(api.events.getEventBySlug, {
    slug: params.slug as string,
  });

  // Convex user record, needed to compare against event.organizerId
  const { data: currentUser } = useConvexQuery(api.users.getCurrentUser);

  // Check if user is already registered
  const { data: registration } = useConvexQuery(
    api.registrations.checkRegistration,
    event?._id ? { eventId: event._id } : "skip"
  );

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title,
          text: event?.description.slice(0, 100) + "...",
          url: url,
        });
      } catch (error) {
        // User cancelled or error occurred
        toast.error(error instanceof Error ? error.message : t("event.shareError"));
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      toast.success(t("event.linkCopied"));
    }
  };

  const handleRegister = () => {
    if (!user) {
      toast.error(t("event.signInToRegister"));
      return;
    }
    setShowRegisterModal(true);
  };

  if (isLoading) {
    return (
      <div aria-busy="true">
        <p className="sr-only" role="status">
          {t("common.loadingEvent")}
        </p>
        <EventSkeleton />
      </div>
    );
  }

  if (!event) {
    notFound();
  }

  const isEventFull = event.registrationCount >= event.capacity;
  const isEventPast = event.endDate < Date.now();
  const isOrganizer = currentUser?._id === event.organizerId;
  const formatContext = {
    locale: event.locale ?? locale,
    timezone: event.timezone,
    currency: event.currency ?? "USD",
  };
  const priceLabel = formatEventPrice(
    event.ticketType,
    event.ticketPrice,
    formatContext
  );
  const eventLocation = formatEventLocation(event);

  return (
    <div
      style={{
        backgroundColor: event.themeColor || "#1e3a8a",
      }}
      className="min-h-screen py-8 -mt-6 md:-mt-16 lg:-mx-5"
    >
      <div className="max-w-7xl mx-auto px-8">
        <div className="mb-3 flex justify-end">
          <LocaleSwitcher />
        </div>
        {/* Event Title & Info */}
        <div className="mb-8">
          <Badge variant="secondary" className="mb-3">
            {getCategoryIcon(event.category)} {getCategoryLabel(event.category)}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{event.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>
                {formatEventDateRange(
                  event.startDate,
                  event.endDate,
                  formatContext
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>
                {formatEventTimeRange(
                  event.startDate,
                  event.endDate,
                  formatContext
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Hero Image */}
        {event.coverImage && (
          <div className="relative h-[400px] rounded-2xl overflow-hidden mb-6">
            <Image
              src={event.coverImage}
              alt={event.title}
              fill
              sizes="(max-width: 768px) 100vw, 1024px"
              className="object-cover"
              priority
            />
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Main Content */}
          <div className="space-y-8">
            {/* Description */}
            <Card
              className={"pt-0"}
              style={{
                backgroundColor: event.themeColor
                  ? darkenColor(event.themeColor, 0.04)
                  : "#1e3a8a",
              }}
            >
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4">{t("event.about")}</h2>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {event.description}
                </p>
              </CardContent>
            </Card>

            {/* Location Details */}
            <Card
              className={"pt-0"}
              style={{
                backgroundColor: event.themeColor
                  ? darkenColor(event.themeColor, 0.04)
                  : "#1e3a8a",
              }}
            >
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-purple-500" />
                  {t("event.location")}
                </h2>

                <div className="space-y-3">
                  <p className="font-medium">
                    {event.locationType === "online"
                      ? t("event.onlineEvent")
                      : eventLocation}
                  </p>
                  {event.address && (
                    <p className="text-sm text-muted-foreground">
                      {event.address}
                    </p>
                  )}
                  {event.venue && (
                    <Button 
                        variant="outline" 
                        className="gap-2"
                        render={<a href={event.venue} target="_blank" rel="noopener noreferrer" />}
                    >
                        {t("event.viewOnMap")}
                        <ExternalLink className="w-4 h-4" />
                    </Button>
                )}
                </div>
              </CardContent>
            </Card>

            <SponsorStrip
              sponsors={event.sponsors}
              themeColor={event.themeColor}
            />

            {/* Organizer Info */}
            <Card
              className={"pt-0"}
              style={{
                backgroundColor: event.themeColor
                  ? darkenColor(event.themeColor, 0.04)
                  : "#1e3a8a",
              }}
            >
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4">{t("event.organizer")}</h2>
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {event.organizerName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{event.organizerName}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("event.organizerRole")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Registration Card */}
          <div className="lg:sticky lg:top-24 h-fit">
            <Card
              className={`overflow-hidden py-0`}
              style={{
                backgroundColor: event.themeColor
                  ? darkenColor(event.themeColor, 0.04)
                  : "#1e3a8a",
              }}
            >
              <CardContent className="p-6 space-y-4">
                {/* Price */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t("event.price")}
                  </p>
                  <p className="text-3xl font-bold">
                    {priceLabel ?? t("event.free")}
                  </p>
                  {event.ticketType === "paid" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("event.payAtVenue")}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Stats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">{t("event.attendees")}</span>
                    </div>
                    <p className="font-semibold">
                      {event.registrationCount} / {event.capacity}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{t("event.date")}</span>
                    </div>
                    <p className="font-semibold text-sm">
                      {formatEventDateRange(
                        event.startDate,
                        event.endDate,
                        formatContext
                      )}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{t("event.time")}</span>
                    </div>
                    <p className="font-semibold text-sm">
                      {formatEventTimeRange(
                        event.startDate,
                        event.endDate,
                        formatContext
                      )}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Registration Button */}
                {registration ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">
                        {t("event.registered")}
                      </span>
                    </div>
                    <Button
                      className="w-full gap-2"
                      onClick={() => router.push("/my-tickets")}
                    >
                      <Ticket className="w-4 h-4" />
                      {t("event.viewTicket")}
                    </Button>
                  </div>
                ) : isEventPast ? (
                  <Button className="w-full" disabled>
                    {t("event.eventEnded")}
                  </Button>
                ) : isEventFull ? (
                  <Button className="w-full" disabled>
                    {t("event.eventFull")}
                  </Button>
                ) : isOrganizer ? (
                  <Button
                    className="w-full"
                    onClick={() =>
                      router.push(`/my-events/${event._id}`)
                    }
                  >
                    {t("event.manage")}
                  </Button>
                ) : (
                  <Button className="w-full gap-2" onClick={handleRegister}>
                    <Ticket className="w-4 h-4" />
                    {t("event.register")}
                  </Button>
                )}

                {/* Share Button */}
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4" />
                  {t("event.share")}
                </Button>

                {/* Report link (FR-030) */}
                <Button
                  variant="ghost"
                  className="w-full gap-2 text-xs text-muted-foreground"
                  render={
                    <Link href={`/feedback?eventId=${event._id}`} />
                  }
                >
                  <Flag className="w-3.5 h-3.5" />
                  {t("event.report")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Register Modal */}
      {showRegisterModal && (
        <RegisterModal
          event={event}
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
        />
      )}
    </div>
  );
}
