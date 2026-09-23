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