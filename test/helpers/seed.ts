import type { MutationCtx } from "../../convex/_generated/server";
import type { Doc, Id } from "../../convex/_generated/dataModel";

type UserDoc = Omit<Doc<"users">, "_id" | "_creationTime">;
type EventDoc = Omit<Doc<"events">, "_id" | "_creationTime">;
type RegistrationDoc = Omit<Doc<"registrations">, "_id" | "_creationTime">;
type InviteDoc = Omit<Doc<"adminInvites">, "_id" | "_creationTime">;
type AuditDoc = Omit<Doc<"auditLogs">, "_id" | "_creationTime">;

export async function seedUser(
  ctx: MutationCtx,
  overrides: Partial<UserDoc> = {}
): Promise<Id<"users">> {
  return ctx.db.insert("users", {
    name: "Test User",
    tokenIdentifier: "token|test",
    email: "test@example.com",
    hasCompletedOnboarding: true,
    freeEventsCreated: 0,
    role: "user",
    createdAt: Date.now(),
    ...overrides,
  });
}

export async function seedEvent(
  ctx: MutationCtx,
  organizerId: Id<"users">,
  overrides: Partial<EventDoc> = {}
): Promise<Id<"events">> {
  const now = Date.now();
  return ctx.db.insert("events", {
    title: "Test Event",
    description: "A description that is long enough for testing.",
    slug: `test-event-${now}`,
    organizerId,
    organizerName: "Test User",
    category: "tech",
    startDate: now + 86_400_000,
    endDate: now + 90_000_000,
    timezone: "Africa/Lagos",
    locationType: "physical",
    city: "Port Harcourt",
    state: "Rivers",
    country: "Nigeria",
    capacity: 10,
    ticketType: "free",
    registrationCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

export async function seedRegistration(
  ctx: MutationCtx,
  eventId: Id<"events">,
  userId: Id<"users">,
  overrides: Partial<RegistrationDoc> = {}
): Promise<Id<"registrations">> {
  return ctx.db.insert("registrations", {
    eventId,
    userId,
    attendeeName: "Attendee",
    attendeeEmail: "attendee@example.com",
    qrCode: `EVT-${Date.now()}-ABCD1234`,
    checkedIn: false,
    status: "confirmed",
    registeredAt: Date.now(),
    ...overrides,
  });
}

export async function seedInvite(
  ctx: MutationCtx,
  createdBy: Id<"users">,
  overrides: Partial<InviteDoc> = {}
): Promise<Id<"adminInvites">> {
  const now = Date.now();
  return ctx.db.insert("adminInvites", {
    email: "invitee@example.com",
    inviteCode: "ADMIN-TEST-CODE",
    status: "pending",
    createdBy,
    createdAt: now,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000,
    ...overrides,
  });
}

export async function seedAuditLog(
  ctx: MutationCtx,
  actorId: Id<"users">,
  overrides: Partial<AuditDoc> = {}
): Promise<Id<"auditLogs">> {
  return ctx.db.insert("auditLogs", {
    actorId,
    actorName: "Admin",
    actorEmail: "admin@example.com",
    action: "event.deleted",
    targetType: "event",
    targetId: "event-1",
    targetLabel: "Test Event",
    createdAt: Date.now(),
    ...overrides,
  });
}
