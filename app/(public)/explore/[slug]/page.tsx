"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { Loader2, MapPin } from "lucide-react";
import { useConvexQuery } from '@/hooks/useConvexQuery';
import { api } from "@/convex/_generated/api";
import { CATEGORIES } from "@/lib/data";
import { parseLocationSlug } from "@/lib/location-utils";
import { Badge } from "@/components/ui/badge";
import EventCard from "@/components/event-card";
import { Doc } from "@/convex/_generated/dataModel";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
} from "@/components/ui/pagination";

export default function DynamicExplorePage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || "";

  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;
  const offset = (currentPage - 1) * limit;

  const categoryInfo = CATEGORIES.find((cat) => cat.id === slug);
  const isCategory = !!categoryInfo;

  const { city, state, isValid } = !isCategory
    ? parseLocationSlug(slug)
    : { city: null, state: null, isValid: true };

  if (!isCategory && !isValid) {
    notFound();
  }

  const { data: events, isLoading } = useConvexQuery(
    isCategory ? api.explore.getEventsByCategory : api.explore.getEventsByLocation,
    isCategory
      ? { category: slug as string, limit, offset }
      : city && state
        ? { city, state, limit, offset }
        : undefined
  );

  const handleEventClick = (eventSlug: string) => {
    router.push(`/events/${eventSlug}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Category View
  if (isCategory) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="pb-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-6xl">{categoryInfo.icon}</div>
            <div>
              <h1 className="text-5xl md:text-6xl font-bold">{categoryInfo.label}</h1>
              <p className="text-lg text-muted-foreground mt-2">{categoryInfo.description}</p>
            </div>
          </div>
          {events && events.length > 0 && (
            <p className="text-muted-foreground">Showing {events.length} events</p>
          )}
        </div>

        <div className="flex-1 min-h-[50vh]">
          <EventGrid events={events} onClick={handleEventClick} />
        </div>
        
        {events && events.length > 0 && (
          <PaginationWrapper 
            currentPage={currentPage} 
            hasMore={events.length === limit} 
            onPageChange={setCurrentPage} 
          />
        )}
      </div>
    );
  }

  // Location View
  return (
    <div className="min-h-screen flex flex-col">
      <div className="pb-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-6xl">📍</div>
          <div>
            <h1 className="text-5xl md:text-6xl font-bold">Events in {city}</h1>
            <p className="text-lg text-muted-foreground mt-2">{state}, Nigeria</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-2">
            <MapPin className="w-3 h-3" />
            {city}, {state}
          </Badge>
          {events && events.length > 0 && (
            <p className="text-muted-foreground">Showing {events.length} events</p>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-[50vh]">
        <EventGrid events={events} onClick={handleEventClick} />
      </div>

      {events && events.length > 0 && (
        <PaginationWrapper 
          currentPage={currentPage} 
          hasMore={events.length === limit} 
          onPageChange={setCurrentPage} 
        />
      )}
    </div>
  );
}

// ── Helper Components ────────────────────────

function EventGrid({ events, onClick }: { events: Doc<"events">[] | undefined, onClick: (slug: string) => void }) {
  if (!events || events.length === 0) {
    return <p className="text-muted-foreground">No events found.</p>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard key={event._id} event={event} onClick={() => onClick(event.slug)} />
      ))}
    </div>
  );
}

function PaginationWrapper({ currentPage, hasMore, onPageChange }: { 
  currentPage: number; 
  hasMore: boolean; 
  onPageChange: (page: number) => void 
}) {
  return (
    <div className="flex justify-center mt-48 mb-16">  {/*  mt-48 = 192px spacing */}
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) onPageChange(currentPage - 1);
              }}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          
          <PaginationItem>
            <PaginationLink href="#" isActive>
              {currentPage}
            </PaginationLink>
          </PaginationItem>
          
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (hasMore) onPageChange(currentPage + 1);
              }}
              className={!hasMore ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}






























// "use client";

// import { useParams, useRouter } from "next/navigation";
// import { notFound } from "next/navigation";
// import { Loader2, MapPin } from "lucide-react";
// import { useConvexQuery } from '@/hooks/useConvexQuery'
// import { api } from "@/convex/_generated/api";
// import { CATEGORIES } from "@/lib/data";
// import { parseLocationSlug } from "@/lib/location-utils";
// import { Badge } from "@/components/ui/badge";
// import EventCard from "@/components/event-card";
// import { Doc } from "@/convex/_generated/dataModel" 

// export default function DynamicExplorePage() {
//   const params = useParams();
//   const router = useRouter();
//  const slug = (params?.slug as string) || "";

//   // Check if it's a valid category
//   const categoryInfo = CATEGORIES.find((cat) => cat.id === slug);
//   const isCategory = !!categoryInfo;

//   // If not a category, validate location
//   const { city, state, isValid } = !isCategory
//     ? parseLocationSlug(slug)
//     : { city: null, state: null, isValid: true };

//   // If it's not a valid category and not a valid location, show 404
//   if (!isCategory && !isValid) {
//     notFound();
//   }

//   // Fetch events based on type
// const { data: events, isLoading } = useConvexQuery(
//   isCategory
//     ? api.explore.getEventsByCategory
//     : api.explore.getEventsByLocation,
//   isCategory
//     ? { category: slug as string, limit: 50 }
//     : city && state
//       ? { city, state, limit: 50 }
//       : undefined // Changed from "skip" to undefined
// );

//   const handleEventClick = (eventSlug: string) => {
//     router.push(`/events/${eventSlug}`);
//   };

//   if (isLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
//       </div>
//     );
//   }

//   // Category View
//   if (isCategory) {
//     return (
//       <>
//         <div className="pb-5">
//           <div className="flex items-center gap-4 mb-4">
//             <div className="text-6xl">{categoryInfo.icon}</div>
//             <div>
//               <h1 className="text-5xl md:text-6xl font-bold">
//                 {categoryInfo.label}
//               </h1>
//               <p className="text-lg text-muted-foreground mt-2">
//                 {categoryInfo.description}
//               </p>
//             </div>
//           </div>

//           {events && events.length > 0 && (
//             <p className="text-muted-foreground">
//               {events.length} event{events.length !== 1 ? "s" : ""} found
//             </p>
//           )}
//         </div>

//         {events && events.length > 0 ? (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {events.map((event: Doc<"events">) => (
//               <EventCard
//                 key={event._id}
//                 event={event}
//                 onClick={() => handleEventClick(event.slug)}
//               />
//             ))}
//           </div>
//         ) : (
//           <p className="text-muted-foreground">
//             No events found in this category.
//           </p>
//         )}
//       </>
//     );
//   }

//   // Location View
//   return (
//     <>
//       <div className="pb-5">
//         <div className="flex items-center gap-4 mb-4">
//           <div className="text-6xl">📍</div>
//           <div>
//             <h1 className="text-5xl md:text-6xl font-bold">Events in {city}</h1>
//             <p className="text-lg text-muted-foreground mt-2">{state}, Nigeria</p>
//           </div>
//         </div>

//         <div className="flex items-center gap-3">
//           <Badge variant="secondary" className="gap-2">
//             <MapPin className="w-3 h-3" />
//             {city}, {state}
//           </Badge>
//           {events && events.length > 0 && (
//             <p className="text-muted-foreground">
//               {events.length} event{events.length !== 1 ? "s" : ""} found
//             </p>
//           )}
//         </div>
//       </div>

//       {events && events.length > 0 ? (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {events.map((event: Doc<"events">) => (
//             <EventCard
//               key={event._id}
//               event={event}
//               onClick={() => handleEventClick(event.slug)}
//             />
//           ))}
//         </div>
//       ) : (
//         <p className="text-muted-foreground">
//           No events in {city}, {state} yet.
//         </p>
//       )}
//     </>
//   );
// }
