import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Audience resolution shared by the preview query, the send mutation, and the
 * scheduled delivery action (FR-027, FR-028).
 */

export const MAX_AUDIENCE = 5000;

export type AudienceType = "all" | "organizers" | "event" | "admins";

export interface AudienceArgs {
  audienceType: AudienceType;
  audienceEventId?: Id<"events">;
}

export interface Recipient {
  email: string;
  name: string;
}

export interface AudienceResult {
  recipients: Recipient[];
  truncated: boolean;
}

export async function resolveAudience(
  ctx: QueryCtx | MutationCtx,
  args: AudienceArgs
): Promise<AudienceResult> {
  const recipients = new Map<string, Recipient>();

  const add = (email: string | undefined, name: string) => {
    const normalised = email?.trim().toLowerCase();
    if (!normalised) return;
    if (!recipients.has(normalised)) {
      recipients.set(normalised, { email: normalised, name });
    }
  };

  if (args.audienceType === "event") {
    if (!args.audienceEventId) return { recipients: [], truncated: false };

    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", args.audienceEventId!).eq("status", "confirmed")
      )
      .take(MAX_AUDIENCE + 1);

    for (const registration of registrations) {
      add(registration.attendeeEmail, registration.attendeeName);
    }

    return {
      recipients: Array.from(recipients.values()),
      truncated: registrations.length > MAX_AUDIENCE,
    };
  }

  const users = await ctx.db.query("users").take(MAX_AUDIENCE + 1);

  if (args.audienceType === "admins") {
    for (const user of users) {
      if (user.role === "admin" || user.role === "super_admin") {
        add(user.email, user.name);
      }
    }
    return {
      recipients: Array.from(recipients.values()),
      truncated: users.length > MAX_AUDIENCE,
    };
  }

  if (args.audienceType === "organizers") {
    const events = await ctx.db.query("events").take(2000);
    const organizerIds = Array.from(
      new Set(events.map((event) => event.organizerId))
    ).slice(0, MAX_AUDIENCE);

    for (const organizerId of organizerIds) {
      const organizer = await ctx.db.get(organizerId);
      if (organizer) add(organizer.email, organizer.name);
    }

    return { recipients: Array.from(recipients.values()), truncated: false };
  }

  for (const user of users) {
    add(user.email, user.name);
  }

  return {
    recipients: Array.from(recipients.values()),
    truncated: users.length > MAX_AUDIENCE,
  };
}
