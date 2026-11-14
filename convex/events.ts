import { query } from "./_generated/server";
import { v } from "convex/values";
import { Country, State, City } from "country-state-city";
import {
  consumeRateLimit,
  requireEventOrganizer,
  secureMutation,
  secureQuery,
} from "./helpers";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { logAdminAction } from "./audit";
import { supportedTimezones } from "./platformData";
import {
  MAX_SPONSOR_LOGO_BYTES,
  SPONSOR_LOGO_TYPES,
  isValidCurrency,
  localeValidator,
  normalizeCurrency,
  normalizeLocale,
  questionDefinitionValidator,
  sponsorValidator,
  supersedeQuestionDefinitions,
  validateQuestionArray,
  validateSponsorArray,
} from "./validators";

// Helper function to safely resolve cover image URLs across Unsplash, Base64, and Convex Storage IDs
async function resolveImageUrl(ctx: QueryCtx | MutationCtx, imageSource?: string) {
  if (!imageSource) return undefined;

  // Direct return for Unsplash/external HTTP URLs and Base64 strings
  if (
    imageSource.startsWith("http://") ||
    imageSource.startsWith("https://") ||
    imageSource.startsWith("data:")
  ) {
    return imageSource;
  }

  // Fallback to Convex Storage lookup only for valid storage IDs
  try {
    return (await ctx.storage.getUrl(imageSource)) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Validate sponsor logos against Convex storage metadata. The client checks
 * MIME type and size first for a fast error, but the server is the authority.
 */
async function validateSponsorLogos(
  ctx: MutationCtx,
  sponsors: Array<{
    id: string;
    name: string;
    logoStorageId: string;
    websiteUrl?: string;
    order: number;
  }>
) {
  const validated = validateSponsorArray(sponsors);

  for (const sponsor of validated) {
    const metadata = await ctx.db.system.get(
      "_storage",
      sponsor.logoStorageId as Id<"_storage">
    );

    if (!metadata) {
      throw new Error(`Logo for "${sponsor.name}" could not be found.`);
    }
    if (metadata.size > MAX_SPONSOR_LOGO_BYTES) {
      throw new Error(`Logo for "${sponsor.name}" must be 2 MB or smaller.`);
    }
    if (
      !metadata.contentType ||
      !(SPONSOR_LOGO_TYPES as readonly string[]).includes(metadata.contentType)
    ) {
      throw new Error(
        `Logo for "${sponsor.name}" must be a PNG, JPEG, or WebP image.`
      );
    }
  }

  return validated;
}

async function resolveSponsors(
  ctx: QueryCtx | MutationCtx,
  sponsors: Array<{
    id: string;
    name: string;
    logoStorageId: string;
    websiteUrl?: string;
    order: number;
  }> | undefined
) {
  if (!sponsors || sponsors.length === 0) return [];

  return await Promise.all(
    sponsors
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(async (sponsor) => {
        let logoUrl: string | undefined;
        try {
          logoUrl =
            (await ctx.storage.getUrl(
              sponsor.logoStorageId as Id<"_storage">
            )) ?? undefined;
        } catch {
          logoUrl = undefined;
        }

        return {
          ...sponsor,
          logoUrl,
        };
      })
  );
}

// Generate standard upload URL for local files
export const generateUploadUrl = secureMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const createEvent = secureMutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    timezone: v.string(),
    locationType: v.union(v.literal("physical"), v.literal("online")),
    venue: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.string(),
    state: v.optional(v.string()),
    country: v.string(),
    countryCode: v.optional(v.string()),
    currency: v.optional(v.string()),
    locale: v.optional(localeValidator),
    capacity: v.number(),
    ticketType: v.union(v.literal("free"), v.literal("paid")),
    ticketPrice: v.optional(v.number()),
    coverImage: v.optional(v.string()),
    themeColor: v.optional(v.string()),
    sponsors: v.optional(v.array(sponsorValidator)),
    registrationQuestions: v.optional(v.array(questionDefinitionValidator)),
    walletEnabled: v.optional(v.boolean()),
    doorModeEnabled: v.optional(v.boolean()),
    hasPro: v.optional(v.boolean()),
  },
  rateLimitName: "createEventRateLimit",
  handler: async (ctx, args) => {
    const hasPro = args.hasPro ?? false;

    if (!hasPro && (ctx.user.freeEventsCreated ?? 0) >= 1) {
      throw new Error(
        "Free event limit reached. Please upgrade to Pro to create more events."
      );
    }

    const defaultColor = "#1e3a8a";
    if (!hasPro && args.themeColor && args.themeColor !== defaultColor) {
      throw new Error(
        "Custom theme colors are a Pro feature. Please upgrade to Pro."
      );
    }

    const themeColor = hasPro ? (args.themeColor ?? defaultColor) : defaultColor;

    const currency = normalizeCurrency(args.currency);
    const locale = normalizeLocale(args.locale);
    const countryCode = args.countryCode?.trim().toUpperCase();

    if (
      countryCode &&
      !Country.getAllCountries().some(
        (country) => country.isoCode.toUpperCase() === countryCode
      )
    ) {
      throw new Error("Choose a valid ISO country code.");
    }

    const sponsors = args.sponsors
      ? await validateSponsorLogos(ctx, args.sponsors)
      : undefined;
    const registrationQuestions = args.registrationQuestions
      ? validateQuestionArray(args.registrationQuestions)
      : undefined;

    const slug = args.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const {
      hasPro: _,
      themeColor: __,
      sponsors: ___,
      registrationQuestions: ____,
      ...dbArgs
    } = args;

    const eventId = await ctx.db.insert("events", {
      ...dbArgs,
      themeColor,
      currency,
      locale,
      countryCode,
      sponsors,
      registrationQuestions,
      walletEnabled: args.walletEnabled !== false,
      doorModeEnabled: args.doorModeEnabled !== false,
      slug: `${slug}-${Date.now()}`,
      organizerId: ctx.user._id,
      organizerName: ctx.user.name,
      registrationCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.patch(ctx.user._id, {
      freeEventsCreated: (ctx.user.freeEventsCreated ?? 0) + 1,
    });

    return eventId;
  },
});

/**
 * Focused event settings mutation (BP-003, BP-004, BP-014).
 *
 * This deliberately does not edit title, dates, or ticket details. General
 * event editing/rescheduling remains BP-009 and must not be implemented here.
 */
export const updateEventSettings = secureMutation({
  args: {
    eventId: v.id("events"),
    currency: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    state: v.optional(v.string()),
    city: v.optional(v.string()),
    timezone: v.optional(v.string()),
    locale: v.optional(localeValidator),
    sponsors: v.optional(v.array(sponsorValidator)),
    registrationQuestions: v.optional(v.array(questionDefinitionValidator)),
    walletEnabled: v.optional(v.boolean()),
    doorModeEnabled: v.optional(v.boolean()),
  },  handler: async (ctx, args) => {
    const { user, event } = await requireEventOrganizer(ctx, args.eventId);

    const bucket =
      args.sponsors !== undefined
        ? "sponsorWriteRateLimit"
        : args.registrationQuestions !== undefined
          ? "questionWriteRateLimit"
          : "eventSettingsRateLimit";

    const budget = await consumeRateLimit(ctx, bucket, user._id);
    if (!budget.ok) throw new Error(budget.message);

    const patch: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.currency !== undefined) {
      if (!isValidCurrency(args.currency)) {
        throw new Error("Supported currencies are NGN, USD, GBP, and EUR.");
      }
      patch.currency = normalizeCurrency(args.currency);
    }

    if (args.countryCode !== undefined) {
      const countryCode = args.countryCode.trim().toUpperCase();
      const valid = Country.getAllCountries().some(
        (country) => country.isoCode.toUpperCase() === countryCode
      );
      if (!valid) throw new Error("Choose a valid ISO country code.");
      patch.countryCode = countryCode;
      const country = Country.getCountryByCode(countryCode);
      if (country) patch.country = country.name;
    }

    const resolvedCountryCode =
      args.countryCode !== undefined
        ? args.countryCode.trim().toUpperCase()
        : event.countryCode?.trim().toUpperCase();

    if (args.state !== undefined) {
      const state = args.state.trim();
      if (state) {
        const states = resolvedCountryCode
          ? State.getStatesOfCountry(resolvedCountryCode)
          : [];
        const valid = states.some(
          (option) =>
            option.name.toLocaleLowerCase() === state.toLocaleLowerCase() ||
            option.isoCode.toUpperCase() === state.toUpperCase()
        );
        if (states.length > 0 && !valid) {
          throw new Error("Choose a valid state or region.");
        }
        const match = states.find(
          (option) =>
            option.name.toLocaleLowerCase() === state.toLocaleLowerCase() ||
            option.isoCode.toUpperCase() === state.toUpperCase()
        );
        patch.state = match?.name ?? state;
      } else {
        patch.state = "";
      }
    }

    if (args.city !== undefined) {
      const city = args.city.trim();
      if (city) {
        const stateName =
          typeof patch.state === "string" ? patch.state : event.state;
        const stateCode = resolvedCountryCode
          ? State.getStatesOfCountry(resolvedCountryCode).find(
              (option) =>
                option.name.toLocaleLowerCase() ===
                  stateName?.toLocaleLowerCase() ||
                option.isoCode.toUpperCase() === stateName?.toUpperCase()
            )?.isoCode
          : undefined;
        const cities =
          resolvedCountryCode && stateCode
            ? City.getCitiesOfState(resolvedCountryCode, stateCode)
            : resolvedCountryCode
              ? City.getCitiesOfCountry(resolvedCountryCode) ?? []
              : [];
        const valid = cities.some(
          (option) => option.name.toLocaleLowerCase() === city.toLocaleLowerCase()
        );
        if (cities.length > 0 && !valid) {
          throw new Error("Choose a valid city.");
        }
        const match = cities.find(
          (option) => option.name.toLocaleLowerCase() === city.toLocaleLowerCase()
        );
        patch.city = match?.name ?? city;
      } else {
        patch.city = "";
      }
    }

    if (args.timezone !== undefined) {
      const timezone = args.timezone.trim();
      if (!supportedTimezones().includes(timezone)) {
        throw new Error("Choose a valid IANA timezone.");
      }
      patch.timezone = timezone;
    }

    if (args.locale !== undefined) {
      patch.locale = normalizeLocale(args.locale);
    }

    if (args.walletEnabled !== undefined) {
      patch.walletEnabled = args.walletEnabled;
    }

    if (args.doorModeEnabled !== undefined) {
      patch.doorModeEnabled = args.doorModeEnabled;
    }

    if (args.sponsors !== undefined) {
      patch.sponsors = await validateSponsorLogos(ctx, args.sponsors);
      await logAdminAction(
        ctx,
        user,
        "event.sponsors_updated",
        "event",
        event._id,
        event.title,
        {
          before: event.sponsors?.map((sponsor) => sponsor.name) ?? [],
          after: (patch.sponsors as Array<{ name: string }>).map(
            (sponsor) => sponsor.name
          ),
        }
      );
    }

    if (args.registrationQuestions !== undefined) {
      // The organizer submits the current definitions; the server derives the
      // archive so a replaced version cannot be lost by a client that only bumps
      // the version number (FR-020, AC-021).
      patch.registrationQuestions = validateQuestionArray(
        supersedeQuestionDefinitions(
          event.registrationQuestions ?? [],
          args.registrationQuestions
        )
      );
      await logAdminAction(
        ctx,
        user,
        "event.questions_updated",
        "event",
        event._id,
        event.title,
        {
          before: event.registrationQuestions?.length ?? 0,
          after: (
            patch.registrationQuestions as Array<unknown>
          ).length,
        }
      );
    }

    await ctx.db.patch(args.eventId, patch);

    return { success: true, updatedAt: patch.updatedAt as number };
  },
});

// Helper Query: Resolves image URLs for individual components when needed
export const getImageUrl = query({
  args: { imageSource: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await resolveImageUrl(ctx, args.imageSource);
  },
});

// Public Query: Fetches event by slug and resolves image URL safely
export const getEventBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!event) return null;

    const coverImageUrl = await resolveImageUrl(ctx, event.coverImage);
    const sponsors = await resolveSponsors(ctx, event.sponsors);

    return {
      ...event,
      coverImageUrl,
      sponsors,
    };
  },
});

// Authenticated Query: Fetches user events and resolves all image types
export const getMyEvents = secureQuery({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", ctx.user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      events.map(async (event) => {
        const coverImageUrl = await resolveImageUrl(ctx, event.coverImage);
        const sponsors = await resolveSponsors(ctx, event.sponsors);
        return {
          ...event,
          coverImageUrl,
          sponsors,
        };
      })
    );
  },
});

// Authenticated Mutation: Deletes event and cleans up Convex storage if applicable
export const deleteEvent = secureMutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (event.organizerId !== ctx.user._id) {
      throw new Error("You are not authorized to delete this event");
    }

    // Delete associated uploaded file from Convex storage if it's a storage ID
    if (
      event.coverImage &&
      !event.coverImage.startsWith("http") &&
      !event.coverImage.startsWith("data:")
    ) {
      try {
        await ctx.storage.delete(event.coverImage);
      } catch {
        // Silently catch if file is missing in storage
      }
    }

    for (const sponsor of event.sponsors ?? []) {
      try {
        await ctx.storage.delete(sponsor.logoStorageId as Id<"_storage">);
      } catch {
        // A sponsor logo may already have been removed from storage.
      }
    }

    // Cascading delete: Remove registrations associated with this event
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const registration of registrations) {
      const walletObjectId = registration.wallet?.objectId;
      if (walletObjectId) {
        // Expire the pass before the registration row disappears. A provider
        // failure is ignored so deletion still succeeds.
        await ctx.scheduler.runAfter(
          0,
          internal.walletNode.voidWalletPass,
          { objectId: walletObjectId }
        );
      }
      await ctx.db.delete(registration._id);
    }

    await ctx.db.delete(args.eventId);

    // Reclaim free event credit
    if (event.ticketType === "free" && (ctx.user.freeEventsCreated ?? 0) > 0) {
      await ctx.db.patch(ctx.user._id, {
        freeEventsCreated: ctx.user.freeEventsCreated - 1,
      });
    }

    return { success: true };
  },
});