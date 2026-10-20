import {
  mutation as rawMutation,
  query as rawQuery,
  MutationCtx,
  QueryCtx,
} from "./_generated/server";
import { PropertyValidators, ObjectType } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { rateLimiter } from "./rateLimiter";




export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  
  if (!user) {
    throw new Error("User not found");
  }
  
  if (user.role !== "admin" && user.role !== "super_admin") {
    throw new Error("Admin access required");
  }
  
  return user;
}

/**
 * Super-admin variant of requireAdmin. Platform settings and broadcast
 * mutations are enforced here, never only in the UI (CON-512 / NFR-002).
 */
export async function requireSuperAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireAdmin(ctx);
  if (user.role !== "super_admin") {
    throw new Error("Super admin access required");
  }
  return user;
}

/** Rate-limit buckets available to admin modules. Keep in sync with rateLimiter.ts. */
export type AdminRateLimitName =
  | "adminSearch"
  | "analytics"
  | "adminExport"
  | "broadcast"
  | "feedbackWrite"
  | "feedbackSubmit";

/**
 * Consume a rate-limit bucket for a key (usually the acting user id).
 *
 * Returns a result instead of throwing: a thrown mutation rolls back its own
 * writes, which would discard the rejection record used by system health.
 */
export async function consumeRateLimit(
  ctx: MutationCtx,
  name: AdminRateLimitName,
  key: string
): Promise<
  | { ok: true }
  | { ok: false; message: string; retryAfterSeconds: number }
> {
  const status = await rateLimiter.limit(ctx, name, { key });
  if (status.ok) return { ok: true };

  await ctx.db.insert("rateLimitRejections", {
    bucket: name,
    createdAt: Date.now(),
  });

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((status.retryAfter ?? 1000) / 1000)
  );
  return {
    ok: false,
    message: `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
    retryAfterSeconds,
  };
}

/**
 * Read-only budget check for query handlers. Queries cannot consume a bucket,
 * so the matching mutation (for example `analytics.pulse`) consumes it and the
 * query rejects once the budget is spent.
 */
export async function assertRateLimitBudget(
  ctx: QueryCtx,
  name: AdminRateLimitName,
  key: string
) {
  const status = await rateLimiter.check(ctx, name, { key });
  if (!status.ok) {
    const seconds = Math.max(1, Math.ceil((status.retryAfter ?? 1000) / 1000));
    throw new Error(`Rate limit exceeded. Try again in ${seconds} seconds.`);
  }
}

/** Page size bounds shared by the new list views. */
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export function clampPageSize(size: number | undefined) {
  return Math.min(Math.max(size ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
}

export function clampPage(page: number | undefined) {
  return Math.max(page ?? 1, 1);
}

/** Mask an email for audience previews: jane@example.com -> j***@example.com */
export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

// 1. Centralized Auth Resolver (Handles both QueryCtx and MutationCtx)
export async function getAuthenticatedUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated. Please sign in.");

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();

  if (!user) throw new Error("User profile not found.");
  return user;
}

// 2. Custom Query Wrapper (Injects pre-authenticated ctx.user)
export function secureQuery<Args extends PropertyValidators, Return>(options: {
  args: Args;
  handler: (
    ctx: QueryCtx & { user: Doc<"users"> },
    args: ObjectType<Args>
  ) => Promise<Return> | Return;
}) {
  return rawQuery({
    args: options.args,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (ctx: any, args: any) => {
      const user = await getAuthenticatedUser(ctx);
      return await options.handler(
        { ...ctx, user },
        args as ObjectType<Args>
      );
    },
  });
}

// 3. Custom Mutation Wrapper (Injects user & handles optional rate limiting)
export function secureMutation<Args extends PropertyValidators, Return>(options: {
  args: Args;
  rateLimitName?: "checkInRateLimit" | "createEventRateLimit";
  handler: (
    ctx: MutationCtx & { user: Doc<"users"> },
    args: ObjectType<Args>
  ) => Promise<Return> | Return;
}) {
  return rawMutation({
    args: options.args,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: async (ctx: any, args: any) => {
      const user = await getAuthenticatedUser(ctx);

      if (options.rateLimitName) {
        const status = await rateLimiter.limit(ctx, options.rateLimitName, {
          key: user._id,
        });

        if (!status.ok) {
          throw new Error(
            `Rate limit exceeded. Try again in ${Math.ceil(
              (status.retryAfter ?? 1000) / 1000
            )} seconds.`
          );
        }
      }

      return await options.handler(
        { ...ctx, user },
        args as ObjectType<Args>
      );
    },
  });
}