
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
    })
    .index("by_token", ["tokenIdentifier"])
    .index("by_createdAt", ["createdAt"]),


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
    .index("by_registeredAt", ["registeredAt"])
    .index("by_event_status", ["eventId", "status"]),

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
            v.literal("registration.cancelled"),
            v.literal("settings.updated"),
            v.literal("announcement.sent"),
            v.literal("feedback.updated"),
            v.literal("feedback.deleted"),
            v.literal("export.generated"),
            v.literal("maintenance.changed")
        ),
        
        // What they acted on
        targetType: v.union(
            v.literal("event"),
            v.literal("user"),
            v.literal("invite"),
            v.literal("registration"),
            v.literal("settings"),
            v.literal("announcement"),
            v.literal("feedback"),
            v.literal("export")
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

    // Platform-wide defaults, feature flags, and maintenance mode (singleton: key = "global")
    platformSettings: defineTable({
        key: v.string(),
        defaultCountry: v.string(),
        defaultCurrency: v.string(),
        defaultTimezone: v.string(),
        maintenanceMode: v.boolean(),
        maintenanceMessage: v.optional(v.string()),
        featureFlags: v.object({
            commandPalette: v.boolean(),
            reports: v.boolean(),
            broadcasts: v.boolean(),
            feedbackInbox: v.boolean(),
            systemHealth: v.boolean(),
        }),
        updatedBy: v.id("users"),
        updatedAt: v.number(),
    }).index("by_key", ["key"]),

    // Broadcast announcements
    announcements: defineTable({
        subject: v.string(),
        body: v.string(),
        audienceType: v.union(
            v.literal("all"),
            v.literal("organizers"),
            v.literal("event"),
            v.literal("admins")
        ),
        audienceEventId: v.optional(v.id("events")),
        recipientCount: v.number(),
        sentCount: v.number(),
        failedCount: v.number(),
        status: v.union(
            v.literal("draft"),
            v.literal("sending"),
            v.literal("sent"),
            v.literal("partial"),
            v.literal("failed")
        ),
        createdBy: v.id("users"),
        createdAt: v.number(),
        sentAt: v.optional(v.number()),
    })
    .index("by_createdAt", ["createdAt"])
    .index("by_status", ["status"]),

    // Per-recipient broadcast delivery outcomes
    announcementDeliveries: defineTable({
        announcementId: v.id("announcements"),
        email: v.string(),
        status: v.union(v.literal("sent"), v.literal("failed")),
        error: v.optional(v.string()),
        createdAt: v.number(),
    })
    .index("by_announcement", ["announcementId"])
    .index("by_status_createdAt", ["status", "createdAt"]),

    // Internal support and abuse reports
    feedback: defineTable({
        type: v.union(
            v.literal("bug"),
            v.literal("feature"),
            v.literal("abuse"),
            v.literal("other")
        ),
        eventId: v.optional(v.id("events")),
        userId: v.id("users"),
        userEmail: v.string(),
        message: v.string(),
        status: v.union(
            v.literal("open"),
            v.literal("in_review"),
            v.literal("resolved"),
            v.literal("dismissed")
        ),
        priority: v.union(
            v.literal("low"),
            v.literal("normal"),
            v.literal("high")
        ),
        adminNotes: v.array(
            v.object({
                authorId: v.id("users"),
                authorName: v.string(),
                body: v.string(),
                createdAt: v.number(),
            })
        ),
        createdAt: v.number(),
        updatedAt: v.number(),
        resolvedBy: v.optional(v.id("users")),
        resolvedAt: v.optional(v.number()),
    })
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_type", ["type"])
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"]),

    // Email delivery log used by the health panel and the action queue
    emailEvents: defineTable({
        template: v.union(v.literal("invite"), v.literal("announcement")),
        recipient: v.string(),
        status: v.union(v.literal("sent"), v.literal("failed")),
        error: v.optional(v.string()),
        createdAt: v.number(),
    })
    .index("by_createdAt", ["createdAt"])
    .index("by_status_createdAt", ["status", "createdAt"]),

    // Cron heartbeats
    cronRuns: defineTable({
        name: v.string(),
        lastRunAt: v.number(),
        status: v.union(v.literal("success"), v.literal("failed")),
        error: v.optional(v.string()),
        processed: v.number(),
    }).index("by_name", ["name"]),

    // Rate-limit rejections, used only as a count signal in system health
    rateLimitRejections: defineTable({
        bucket: v.string(),
        createdAt: v.number(),
    }).index("by_createdAt", ["createdAt"]),
})