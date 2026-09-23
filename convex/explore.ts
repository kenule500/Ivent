import { v } from "convex/values";
import { query } from "./_generated/server";
import { QueryCtx } from "@/convex/_generated/server";


// Helper: Bounded index fetch for upcoming events
export async function getUpcomingEvents(ctx: QueryCtx, limit: number = 100) {
  const now = Date.now();
  return await ctx.db
    .query("events")
    .withIndex("by_startDate", (q) => q.gte("startDate", now))
    .order("asc")
    .take(limit);
}


// Get featured events (sorted by registration count)
export const getFeaturedEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const events = await getUpcomingEvents(ctx, 100);

    return events
      .sort((a, b) => b.registrationCount - a.registrationCount)
      .slice(0, args.limit ?? 3);
  },
});


// convex/explore.ts

export const getEventsByLocation = query({
  args: {
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()), // 👈 ADD THIS
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const allUpcomingEvents = await ctx.db
      .query("events")
      .filter((q) => q.gte(q.field("startDate"), now))
      .order("desc")
      .take(200); 

    let filteredEvents = allUpcomingEvents;

    if (args.city) {
      const cityLower = args.city.toLowerCase();
      filteredEvents = filteredEvents.filter((e) => e.city?.toLowerCase() === cityLower);
    }
    if (args.state) {
      const stateLower = args.state.toLowerCase();
      filteredEvents = filteredEvents.filter((e) => e.state?.toLowerCase() === stateLower);
    }

    // 👈 APPLY OFFSET AND LIMIT
    const offset = args.offset ?? 0;
    const limit = args.limit ?? 10;
    return filteredEvents.slice(offset, offset + limit);
  },
});

// Do the EXACT SAME THING for getEventsByCategory:
export const getEventsByCategory = query({
  args: {
    category: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()), // 👈 ADD THIS
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const allUpcomingEvents = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("category"), args.category))
      .filter((q) => q.gte(q.field("startDate"), now))
      .order("desc")
      .take(200);

    const offset = args.offset ?? 0;
    const limit = args.limit ?? 10;
    return allUpcomingEvents.slice(offset, offset + limit);
  },
});

// // Get events by location (city/state)
// export const getEventsByLocation = query({
//   args: {
//     city: v.optional(v.string()),
//     state: v.optional(v.string()),
//     limit: v.optional(v.number()),
//   },
//   handler: async (ctx, args) => {
//     const upcomingEvents = await getUpcomingEvents(ctx, 100);

    
//     console.log(`city: ${args.city}, state: ${args.state}, limit: ${args.limit}`);
//     let filteredEvents = upcomingEvents;

//     if (args.city) {
//       const cityLower = args.city.toLowerCase();
//       filteredEvents = filteredEvents.filter(
//         (e) => e.city?.toLowerCase() === cityLower
//       );
//     }

//     if (args.state) {
//       const stateLower = args.state.toLowerCase();
//       filteredEvents = filteredEvents.filter(
//         (e) => e.state?.toLowerCase() === stateLower
//       );
//     }

//     return filteredEvents.slice(0, args.limit ?? 4);
//   },
// });



// // Get events by category
// export const getEventsByCategory = query({
//   args: {
//     category: v.string(),
//     limit: v.optional(v.number()),
//   },
//   handler: async (ctx, args) => {
//     const now = Date.now();
//     const maxLimit = args.limit ?? 12;

//     return await ctx.db
//       .query("events")
//       .withIndex("by_category", (q) => q.eq("category", args.category))
//       .filter((q) => q.gte(q.field("startDate"), now))
//       .take(maxLimit);
//   },
// });

// Get popular events
export const getPopularEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const events = await getUpcomingEvents(ctx, 100);

    return events
      .sort((a, b) => b.registrationCount - a.registrationCount)
      .slice(0, args.limit ?? 6);
  },
});


// Count upcoming events by category
export const getCategoryCounts = query({
  handler: async (ctx) => {
    const events = await getUpcomingEvents(ctx, 200);

    const counts: Record<string, number> = {};
    events.forEach((event) => {
      if (event.category) {
        counts[event.category] = (counts[event.category] || 0) + 1;
      }
    });

    return counts;
  },
});


















































// import { v } from "convex/values";
// import { query } from "./_generated/server";


// export const getFeaturedEvents = query({
//   args: {
//     limit: v.optional(v.number()),
//   },
//   handler: async (ctx, args) => {
//     const now = Date.now();
//     const events = await ctx.db
//       .query("events")
//       .withIndex("by_startDate", (q) => q.gt("startDate", now))
//       .order("desc")
//       .collect();

//       // sorted by registration count for featured events
//       const featuredEvents = events.sort((a, b) => b.registrationCount - a.registrationCount).slice(0, args.limit ?? 3);
//       return featuredEvents;
//     },
//   })

//   // Get events by location (city/state)
// export const getEventsByLocation = query({
//   args: {
//     city: v.optional(v.string()),
//     state: v.optional(v.string()),
//     limit: v.optional(v.number()),
//   },
//   handler: async (ctx, args) => {
//     const now = Date.now();
    
//     // ✅ Log what we're searching for
//     // console.log("🔍 Searching for events in:", { city: args.city, state: args.state });
    
//     // Fetch a reasonable batch of upcoming events
//     const allUpcomingEvents = await ctx.db
//       .query("events")
//       .withIndex("by_startDate")
//       .filter((q) => q.gte(q.field("startDate"), now))
//       .order("asc")
//       .take(100);
    
//     // console.log(`📊 Found ${allUpcomingEvents.length} upcoming events total`);
    
//     // Show what cities we have
//     const cities = [...new Set(allUpcomingEvents.map(e => e.city))];
//     // console.log("🏙️ Available cities:", cities);
    
//     // Filter in JavaScript with case-insensitive matching
//     let filteredEvents = allUpcomingEvents;
    
//     if (args.city) {
//       const cityLower = args.city.toLowerCase();
//       filteredEvents = filteredEvents.filter(e => 
//         e.city?.toLowerCase() === cityLower
//       );
//       // console.log(`🏙️ After city filter (${args.city}): ${filteredEvents.length} events`);
//     }
    
//     if (args.state) {
//       const stateLower = args.state.toLowerCase();
//       filteredEvents = filteredEvents.filter(e => 
//         e.state?.toLowerCase() === stateLower
//       );
//       // console.log(`📍 After state filter (${args.state}): ${filteredEvents.length} events`);
//     }

//     const result = filteredEvents.slice(0, args.limit ?? 4);
//     // console.log(`✅ Returning ${result.length} events`);

//     return result;
//   },
// });


// export const getPopularEvents = query({
//   args: {
//     limit: v.optional(v.number()),
//   },
//   handler: async (ctx, args) => {
//     const now = Date.now();
//     const events = await ctx.db
//       .query("events")
//       .withIndex("by_startDate")
//       .filter((q) => q.gte(q.field("startDate"), now))
//       .order("desc")
//       .collect();   
    
//     //  Sort by registration count for popular events
//     const popularEvents = events.sort((a, b) => b.registrationCount - a.registrationCount).slice(0, args.limit ?? 6);
//     return popularEvents;
//   }, 
// })

// export const getEventsByCategory = query({
//   args: {
//     category: v.string(),
//     limit: v.optional(v.number()),
//   },
//   handler: async (ctx, args) => {
//     const now = Date.now();
//     const events = await ctx.db
//       .query("events")
//       .withIndex("by_category", (q) => q.eq("category", args.category))
//       .filter((q) => q.gte(q.field("startDate"), now))
//       .order("desc")
//       .collect();   
    
//     return events.slice(0, args.limit ?? 12)
//   }, 
// })

// export const getCategoryCounts= query({
//   handler: async (ctx) => {
//     const now = Date.now();
//     const events = await ctx.db
//       .query("events")
//       .withIndex("by_category")
//       .filter((q) => q.gte(q.field("startDate"), now))
//       .collect();   
    
//     // Counts events by category
//     const counts: Record<string, number> = {};
//     events.forEach((event) => {
//       counts[event.category] = (counts[event.category] || 0) + 1;
//     })
//     return counts;
//   }, 
// })