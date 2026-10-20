// convex/admin.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAdmin, enforceRateLimit } from "./helpers";
import { Id } from "./_generated/dataModel";
import { logAdminAction } from "./audit";
import { rateLimiter } from "./rateLimiter";

// ============ CONSTANTS ============

// Invites expire after 7 days
const INVITE_EXPIRY_DAYS = 7;
const INVITE_EXPIRY_MS = INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// ============ DASHBOARD STATS ============

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    
    const [users, events, registrations] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("events").collect(),
      ctx.db.query("registrations").collect(),
    ]);
    
    const now = Date.now();
    const upcomingEvents = events.filter(e => e.startDate > now).length;
    
    return {
      totalUsers: users.length,
      totalEvents: events.length,
      totalRegistrations: registrations.length,
      upcomingEvents,
    };
  },
});

// ============ COMMAND CENTER ============

/** Ten most recent audit entries for the dashboard (FR-009). */
export const getRecentAudit = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(Math.max(args.limit ?? 10, 1), 50);
    return ctx.db
      .query("auditLogs")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);
  },
});

const PALETTE_GROUP_LIMIT = 5;

/**
 * Admin-authorized palette search (FR-005, NFR-003).
 * Pages are resolved on the client from lib/admin-nav.ts; this returns data only.
 */
export const searchPalette = mutation({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const query = args.query.trim();

    if (query.length < 2) {
      return { users: [], events: [], registrations: [] };
    }

    await enforceRateLimit(ctx, "adminSearch", admin._id);

    const lower = query.toLowerCase();

    const [events, recentUsers, recentRegistrations] = await Promise.all([
      ctx.db
        .query("events")
        .withSearchIndex("search_title", (q) => q.search("title", query))
        .take(PALETTE_GROUP_LIMIT),
      ctx.db.query("users").order("desc").take(500),
      ctx.db
        .query("registrations")
        .withIndex("by_registeredAt")
        .order("desc")
        .take(500),
    ]);

    const users = recentUsers
      .filter(
        (user) =>
          user.name.toLowerCase().includes(lower) ||
          user.email.toLowerCase().includes(lower)
      )
      .slice(0, PALETTE_GROUP_LIMIT)
      .map((user) => ({
        id: user._id,
        label: user.name || user.email,
        email: user.email,
        role: user.role ?? "user",
      }));

    const registrations = recentRegistrations
      .filter(
        (registration) =>
          registration.attendeeName.toLowerCase().includes(lower) ||
          registration.attendeeEmail.toLowerCase().includes(lower)
      )
      .slice(0, PALETTE_GROUP_LIMIT)
      .map((registration) => ({
        id: registration._id,
        label: registration.attendeeName,
        email: registration.attendeeEmail,
        eventId: registration.eventId,
      }));

    return {
      users,
      events: events.map((event) => ({
        id: event._id,
        label: event.title,
        startDate: event.startDate,
        city: event.city ?? null,
      })),
      registrations,
    };
  },
});

// ============ USER MANAGEMENT ============

export const getAllUsers = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    let users = await ctx.db.query("users").order("desc").take(args.limit ?? 100);
    
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      users = users.filter(u => 
        u.name.toLowerCase().includes(searchLower) || 
        u.email.toLowerCase().includes(searchLower)
      );
    }
    
    return users;
  },
});

export const toggleUserBan = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    
    if (!user) throw new Error("User not found");
    if (user.role === "admin" || user.role === "super_admin") {
      throw new Error("Cannot ban another admin");
    }
    
    const newBannedState = !user.banned;
    
    await ctx.db.patch(args.userId, {
      banned: newBannedState,
      updatedAt: Date.now(),
    });
    
    // 📝 Log the action
    await logAdminAction(
      ctx,
      admin,
      newBannedState ? "user.banned" : "user.unbanned",
      "user",
      args.userId,
      user.email
    );
    
    return { success: true };
  },
});

export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("super_admin")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    
    if (admin.role !== "super_admin") {
      throw new Error("Only super admin can assign roles");
    }
    
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    
    const previousRole = user.role || "user";
    
    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    });
    
    // 📝 Log the action
    await logAdminAction(
      ctx,
      admin,
      "user.role_changed",
      "user",
      args.userId,
      user.email,
      { from: previousRole, to: args.role }
    );
    
    return { success: true };
  },
});

// ============ EVENT MANAGEMENT ============

export const getAllEvents = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    let events = await ctx.db.query("events").order("desc").take(args.limit ?? 100);
    
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      events = events.filter(e => e.title.toLowerCase().includes(searchLower));
    }
    
    return events;
  },
});

export const deleteEvent = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    
    // Delete all registrations for this event
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    
    for (const reg of registrations) {
      await ctx.db.delete(reg._id);
    }
    
    // Delete the event
    await ctx.db.delete(args.eventId);
    
    // 📝 Log the action
    await logAdminAction(
      ctx,
      admin,
      "event.deleted",
      "event",
      args.eventId,
      event.title,
      { registrationCount: event.registrationCount }
    );
    
    return { success: true };
  },
});

// ============ REGISTRATION MANAGEMENT ============

export const getAllRegistrations = query({
  args: {
    eventId: v.optional(v.id("events")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    if (args.eventId) {
      return await ctx.db
        .query("registrations")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId as Id<"events">))
        .order("desc")
        .take(args.limit ?? 100);
    }
    
    return await ctx.db.query("registrations").order("desc").take(args.limit ?? 100);
  },
});

// ============ ADMIN INVITES ============

/**
 * Generate an admin invite code (super admin only)
 * Creates a new pending invite with a 7-day expiry window.
 */
/**
 * Generate an admin invite code (super admin only)
 * Returns both the code and its expiry timestamp.
 */


export const generateInviteCode = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    // Rate limit: max 10 invite generations per minute per admin
    const status = await rateLimiter.limit(ctx, "generateInviteRateLimit", {
      key: admin._id,
    });

    if (!status.ok) {
      throw new Error(
        `Rate limit exceeded. Try again in ${Math.ceil(
          (status.retryAfter ?? 1000) / 1000
        )} seconds.`
      );
    }

    // Only super admin can generate invite codes
    if (admin.role !== "super_admin") {
      throw new Error("Only super admin can generate invite codes");
    }

    // Normalize email
    const email = args.email.trim().toLowerCase();

    // Generate a secure invite code
    const inviteCode = `ADMIN-${Date.now()}-${crypto
      .randomUUID()
      .slice(0, 8)
      .toUpperCase()}`;

    const now = Date.now();
    const expiresAt = now + INVITE_EXPIRY_MS;

    // Check if an invite already exists for this email
    const existingInvite = await ctx.db
      .query("adminInvites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingInvite && existingInvite.status !== "accepted") {
      await ctx.db.patch(existingInvite._id, {
        inviteCode,
        status: "pending",
        createdBy: admin._id,
        createdAt: now,
        expiresAt,
        revokedBy: undefined,
        revokedAt: undefined,
      });

      await logAdminAction(
        ctx,
        admin,
        "invite.created",
        "invite",
        email,
        email,
        { expiresAt }
      );

      return { inviteCode, expiresAt };
    }

    if (existingInvite && existingInvite.status === "accepted") {
      throw new Error("This email already has an accepted admin invite");
    }

    await ctx.db.insert("adminInvites", {
      email,
      inviteCode,
      status: "pending",
      createdBy: admin._id,
      createdAt: now,
      expiresAt,
    });

    await logAdminAction(
      ctx,
      admin,
      "invite.created",
      "invite",
      email,
      email,
      { expiresAt }
    );

    return { inviteCode, expiresAt };
  },
});

/**
 * Verify an admin invite code during signup
 * Checks: exists → pending → not expired → code matches
 * On success: marks invite as accepted + assigns admin role
 */
export const verifyInviteCode = mutation({
  args: {
    email: v.string(),
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    
    const email = args.email.trim().toLowerCase();
    
    const invite = await ctx.db
      .query("adminInvites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    
    if (!invite) {
      throw new Error("No invite found for this email");
    }
    
    if (invite.status === "accepted") {
      throw new Error("This invite has already been accepted");
    }
    
    if (invite.status === "revoked") {
      throw new Error("This invite has been revoked");
    }
    
    if (invite.status === "expired" || invite.expiresAt < Date.now()) {
      // Auto-mark as expired if not already
      if (invite.status !== "expired") {
        await ctx.db.patch(invite._id, { status: "expired" });
      }
      throw new Error("This invite has expired. Request a new one.");
    }
    
    if (invite.inviteCode !== args.inviteCode) {
      throw new Error("Invalid invite code");
    }
    
    // Find the current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    
    if (!user) throw new Error("User not found");
    
    // Mark invite as accepted
    await ctx.db.patch(invite._id, {
      status: "accepted",
      acceptedBy: user._id,
      acceptedAt: Date.now(),
    });
    
    // Promote user to admin
    await ctx.db.patch(user._id, {
      role: "admin",
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

/**
 * Revoke a pending invite (super admin only)
 */
export const revokeInvite = mutation({
  args: {
    inviteId: v.id("adminInvites"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    
    if (admin.role !== "super_admin") {
      throw new Error("Only super admin can revoke invites");
    }
    
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite not found");
    
    if (invite.status === "accepted") {
      throw new Error("Cannot revoke an accepted invite");
    }
    
    if (invite.status === "revoked") {
      throw new Error("Invite is already revoked");
    }
    
    await ctx.db.patch(args.inviteId, {
      status: "revoked",
      revokedBy: admin._id,
      revokedAt: Date.now(),
    });
    
    await logAdminAction(
      ctx,
      admin,
      "invite.revoked",
      "invite",
      args.inviteId,
      invite.email
    );

    return { success: true };
  },
});

/**
 * Permanently delete an invite (super admin only).
 * Only allowed for pending, expired, or revoked invites.
 * Accepted invites are preserved for audit trail.
 */
export const deleteInvite = mutation({
  args: {
    inviteId: v.id("adminInvites"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    if (admin.role !== "super_admin") {
      throw new Error("Only super admin can delete invites");
    }

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite not found");

    if (invite.status === "accepted") {
      throw new Error("Cannot delete an accepted invite");
    }

    // 📝 Log before deleting
    await logAdminAction(
      ctx,
      admin,
      "invite.deleted",
      "invite",
      args.inviteId,
      invite.email
    );

    await ctx.db.delete(args.inviteId);

    return { success: true };
  },
});

/**
 * Resend an invite — regenerates the code and extends expiry
 * (super admin only). Works on pending or expired invites.
 */
export const resendInvite = mutation({
  args: {
    inviteId: v.id("adminInvites"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    
    if (admin.role !== "super_admin") {
      throw new Error("Only super admin can resend invites");
    }
    
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite not found");
    
    if (invite.status === "accepted") {
      throw new Error("Cannot resend an accepted invite");
    }
    
    const now = Date.now();
    const newCode = `ADMIN-${now}-${crypto
      .randomUUID()
      .slice(0, 8)
      .toUpperCase()}`;
    
    await ctx.db.patch(args.inviteId, {
      inviteCode: newCode,
      status: "pending",
      createdAt: now,
      expiresAt: now + INVITE_EXPIRY_MS,
      revokedBy: undefined,
      revokedAt: undefined,
    });
    

    await logAdminAction(
      ctx,
      admin,
      "invite.resent",
      "invite",
      args.inviteId,
      invite.email
    );

    return newCode;
  },
});

/**
 * Get all admin invites (admin only)
 * Returns rows plus a computed `isExpired` flag for the UI.
 */
/**
 * Get all admin invites (admin only)
 * Returns rows plus a computed `isExpired` flag for the UI.
 * Also populates the accepted user info.
 */
export const getAdminInvites = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    
    const invites = await ctx.db
      .query("adminInvites")
      .order("desc")
      .collect();
    
    const now = Date.now();
    
    // Populate acceptedBy user info
    const invitesWithUsers = await Promise.all(
      invites.map(async (invite) => {
        let acceptedByUser = null;
        
        if (invite.acceptedBy) {
          const user = await ctx.db.get(invite.acceptedBy);
          if (user) {
            acceptedByUser = {
              _id: user._id,
              name: user.name,
              email: user.email,
              image: user.image,
            };
          }
        }
        
        return {
          ...invite,
          isExpired: invite.status === "pending" && invite.expiresAt < now,
          acceptedByUser,
        };
      })
    );
    
    return invitesWithUsers;
  },
});
