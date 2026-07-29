
import { defineSchema, defineTable } from "convex/server";
import {v} from "convex/values";

export default defineSchema({
    //Users Table
    users: defineTable({
        name: v.string(),
        tokenIdentifier: v.string(),
        email: v.string(),
        image: v.optional(v.string()),

        //onboarding
        hasCompletedOnboarding: v.boolean(),

        location: v.optional(
            v.object({
                city: v.string(),
                state: v.optional(v.string()),
                country: v.string(),
            })
        ),
        interests: v.optional(v.array(v.string())),

        freeEventsCreated: v.number(),

        createdAt: v.optional(v.number()),
        updatedAt: v.optional(v.number()),
    }).index("by_token", ["tokenIdentifier"]),


    events: defineTable({
        title: v.string(),
        description: v.string(),
        slug: v.string(),

        //Organizer
        organizerId: v.id("users"),
        organizerName: v.string(),

        //Event Details
        category: v.string(),
        tags: v.optional(v.array(v.string())),


        //Date and Time
        startDate: v.number(),
        endDate: v.number(),
        timezone: v.string(),

        //Location
        locationType: v.union(v.literal("physical"), v.literal("online")),
        venue: v.optional(v.string()),
        address: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        country: v.optional(v.string()),


        //capacity and ticketing
        capacity: v.number(),
        ticketType: v.union(v.literal("free"), v.literal("paid")),
        ticketPrice: v.optional(v.number()),
        registrationCount: v.number(),

        //customization
        coverImage: v.optional(v.string()),
        themeColor: v.optional(v.string()),

        //Timestamps
        createdAt: v.optional(v.number()),
        updatedAt: v.optional(v.number()),
    })
    .index("by_organizer", ["organizerId"])
    .index("by_slug", ["slug"])
    .index("by_category", ["category"])
    .index("by_startDate", ["startDate"])
    .searchIndex("search_title", {
        searchField: "title",
    }),

    registrations: defineTable({
        eventId: v.id("events"),
        userId: v.id("users"),

        //Attendee Details
        attendeeName: v.string(),
        attendeeEmail: v.string(),

        //QR Code 
        qrCode: v.string(),

        //Check-in Status
        checkedIn: v.boolean(),
        checkedInAt: v.optional(v.number()),

        //status
        status: v.union(v.literal("confirmed"), v.literal("cancelled")),

        registeredAt: v.number()
    })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_event_user", ["eventId", "userId"])
    .index("by_qrCode", ["qrCode"])
})