"use client"

import { api } from '@/convex/_generated/api'
import { useConvexQuery } from '@/hooks/useConvexQuery'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import Autoplay from "embla-carousel-autoplay";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel'
import { ArrowRight, Calendar, MapPin, Users, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import Image from 'next/image'
import { Doc } from "@/convex/_generated/dataModel" 
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createLocationSlug } from '@/lib/location-utils'
import { CATEGORIES } from '@/lib/data'
import EventCard from '@/components/event-card'
import Link from 'next/link'

const ExplorePage = () => {
    const router = useRouter();
    const [plugin] = useState(() => Autoplay({ delay: 2000, stopOnInteraction: true }));
  
    const { data: currentUser } = useConvexQuery(api.users.getCurrentUser);
    const { data: featuredEvents, isLoading: loadingFeatured } = useConvexQuery(api.explore.getFeaturedEvents, { limit: 4 })
    
    const { data: localEvents, isLoading: loadingLocal } = useConvexQuery(
        api.explore.getEventsByLocation,
        {
            city: currentUser?.location?.city || "Port Harcourt",
            state: currentUser?.location?.state || "Rivers",
            limit: 4
        }
    )
    
    const { data: popularEvents, isLoading: loadingPopular } = useConvexQuery(api.explore.getPopularEvents, { limit: 6 })
    const { data: categoryCounts } = useConvexQuery(api.explore.getCategoryCounts)

    const handleEventClick = (slug: string) => {
        router.push(`/events/${slug}`);
    };

    const handleCategoryClick = (categoryId: string) => {
        router.push(`/explore/${categoryId}`);
    };

    const handleViewLocalEvents = () => {
        const city = currentUser?.location?.city || "Port Harcourt";
        const state = currentUser?.location?.state || "Rivers";
        const slug = createLocationSlug(city, state);
        router.push(`/explore/${slug}`);
    };

    const categoriesWithCounts = CATEGORIES.map((cat) => ({
        ...cat,
        count: categoryCounts?.[cat.id] || 0,
    }));

    // ✅ FIX: Remove the aggressive loading state
    // Instead, show the page immediately and let each section handle its own loading state

    return (
        <>
            <div className="pb-12 text-center"> 
                <div className="text-5xl md:text-6xl font-bold mb-4">Discover Events</div>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                    Explore featured events, find what&apos;s happening locally, or browse
                    events across India
                </p>
            </div>

            {/* Featured Carousel */}
            <div className="mb-16">
                {loadingFeatured ? (
                    <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-muted rounded-xl">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                    </div>
                ) : featuredEvents && featuredEvents.length > 0 ? (
                    <Carousel
                        plugins={[plugin]}
                        className="w-full"
                        onMouseEnter={() => plugin.stop()}
                        onMouseLeave={() => plugin.reset()}
                    >
                        <CarouselContent>
                            {featuredEvents.map((event: Doc<"events">) => (
                                <CarouselItem key={event._id}>
                                    <div
                                        className="relative h-[400px] rounded-xl overflow-hidden cursor-pointer"
                                        onClick={() => handleEventClick(event.slug)}
                                    >
                                        {event.coverImage ? (
                                            <Image
                                                src={event.coverImage}
                                                alt={event.title}
                                                fill
                                                className="object-cover"
                                                priority
                                            />
                                        ) : (
                                            <div
                                                className="absolute inset-0"
                                                style={{ backgroundColor: event.themeColor || "#333333" }}
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
                                        <div className="relative h-full flex flex-col justify-end p-8 md:p-12">
                                            <Badge className="w-fit mb-4" variant="secondary">
                                                {[event.city, event.state || event.country].filter(Boolean).join(", ")}
                                            </Badge>
                                            <h2 className="text-3xl md:text-5xl font-bold mb-3 text-white">
                                                {event.title}
                                            </h2>
                                            <p className="text-lg text-white/90 mb-4 max-w-2xl line-clamp-2">
                                                {event.description}
                                            </p>
                                            <div className="flex items-center gap-4 text-white/80">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" />
                                                    <span className="text-sm">
                                                        {format(event.startDate, "PPP")}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4" />
                                                    <span className="text-sm">{event.city || "Online"}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4" />
                                                    <span className="text-sm">
                                                        {event.registrationCount} registered
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="left-4" />
                        <CarouselNext className="right-4" />
                    </Carousel>
                ) : null}
            </div>

            {/* Local Events */}
            {localEvents && localEvents.length > 0 && (
                <div className="mb-16">
                <div className="flex items-center justify-between mb-6">
                    <div>
                    <h2 className="text-3xl font-bold mb-1">Events Near You</h2>
                    <p className="text-muted-foreground">
                        Happening in {currentUser?.location?.city || "your area"}
                    </p>
                    </div>
                    <Button
                    variant="outline"
                    className="gap-2"
                    onClick={handleViewLocalEvents}
                    >
                    View All <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {localEvents.map((event) => (
                    <EventCard
                        key={event._id}
                        event={event}
                        variant="grid"
                        onClick={() => handleEventClick(event.slug)}
                    />
                    ))}
                </div>
                </div>
            )}

            {/* Browse by Category */}
            <div className="mb-16">
                <h2 className="text-3xl font-bold mb-6">Browse by Category</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                    {categoriesWithCounts.map((category) => (
                        <Card
                            key={category.id}
                            className="py-2 group cursor-pointer hover:shadow-lg transition-all hover:border-purple-500/50"
                            onClick={() => handleCategoryClick(category.id)}
                        >
                            <CardContent className="px-3 sm:p-6 flex items-center gap-3">
                                <div className="text-3xl sm:text-4xl">{category.icon}</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold mb-1 group-hover:text-purple-400 transition-colors">
                                        {category.label}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {category.count} Event{category.count !== 1 ? "s" : ""}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Popular Events Across Country */}
            <div className="mb-16">
                <div className="mb-6">
                    <h2 className="text-3xl font-bold mb-1">Popular Across Nigeria</h2>
                    <p className="text-muted-foreground">Trending events nationwide</p>
                </div>

                {loadingPopular ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <Card key={i} className="h-32 animate-pulse bg-muted" />
                        ))}
                    </div>
                ) : popularEvents && popularEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {popularEvents.map((event: Doc<"events">) => (
                            <EventCard
                                key={event._id}
                                event={event}
                                variant="list"
                                onClick={() => handleEventClick(event.slug)}
                            />
                        ))}
                    </div>
                ) : (
                    <Card className="p-8 text-center">
                        <p className="text-muted-foreground">
                            No popular events yet.
                        </p>
                    </Card>
                )}
            </div>

            {/* Global Empty State - Only show if ALL sections are empty */}
            {!loadingFeatured &&
                !loadingLocal &&
                !loadingPopular &&
                (!featuredEvents || featuredEvents.length === 0) &&
                (!localEvents || localEvents.length === 0) &&
                (!popularEvents || popularEvents.length === 0) && (
                <Card className="p-12 text-center">
                    <div className="max-w-md mx-auto space-y-4">
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-2xl font-bold">No events yet</h2>
                        <p className="text-muted-foreground">
                            Be the first to create an event in your area!
                        </p>
                        <Button render={<Link href="/create-event" />} className="gap-2">
                            Create Event
                        </Button>
                    </div>
                </Card>
            )} 
        </>
    )
}

export default ExplorePage;