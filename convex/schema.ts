
import { defineSchema, defineTable } from "convex/server";
import {v} from "convex/values";

export default defineSchema({
    //Users Table
    users: defineTable({
        name: v.string(),
        tokenIdentifier: v.string(),
        email: v.string(),
        image: v.optional(v.string()),

        role: v.optional(v.union(v.literal("user"), v.literal("admin"), v.literal("super_admin"))),
        banned: v.optional(v.boolean()),

        preferences: v.optional(
            v.object({
                emailOnNewEvent: v.boolean(),
                emailOnNewRegistration: v.boolean(),
                emailOnNewAdminInvite: v.boolean(),
                emailOnNewUser: v.boolean(),
            })
        ),
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
    .index("by_qrCode", ["qrCode"]),

    // convex/schema.ts (Add this table)
    adminInvites: defineTable({
        email: v.string(),
        inviteCode: v.string(),
        
        // Status enum instead of just "used" boolean
        status: v.union(
            v.literal("pending"),
            v.literal("accepted"),
            v.literal("expired"),
            v.literal("revoked")
        ),
        
        // Who created it
        createdBy: v.id("users"),
        createdAt: v.number(),
        
        // Expiry timestamp
        expiresAt: v.number(),
        
        // Who accepted it (if accepted)
        acceptedBy: v.optional(v.id("users")),
        acceptedAt: v.optional(v.number()),
        
        // Who revoked it (if revoked)
        revokedBy: v.optional(v.id("users")),
        revokedAt: v.optional(v.number()),
        })
        .index("by_email", ["email"])
        .index("by_inviteCode", ["inviteCode"])
        .index("by_status", ["status"]),
    
    auditLogs: defineTable({
        // Who performed the action
        actorId: v.id("users"),
        actorName: v.string(),
        actorEmail: v.string(),
        
        // What they did
        action: v.union(
            v.literal("event.deleted"),
            v.literal("user.banned"),
            v.literal("user.unbanned"),
            v.literal("user.role_changed"),
            v.literal("invite.created"),
            v.literal("invite.revoked"),
            v.literal("invite.resent"),
            v.literal("invite.deleted"),
            v.literal("registration.cancelled")
        ),
        
        // What they acted on
        targetType: v.union(
            v.literal("event"),
            v.literal("user"),
            v.literal("invite"),
            v.literal("registration")
        ),
        targetId: v.string(),
        targetLabel: v.string(), // e.g. event title, user email, invite code
        
        // Optional extra context
        metadata: v.optional(v.any()),
        
        // When
        createdAt: v.number(),
        })
        .index("by_createdAt", ["createdAt"])
        .index("by_actor", ["actorId"])
        .index("by_action", ["action"]),
})