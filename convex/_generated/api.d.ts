/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as analytics from "../analytics.js";
import type * as analyticsFilters from "../analyticsFilters.js";
import type * as audit from "../audit.js";
import type * as commandCenter from "../commandCenter.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as emailLog from "../emailLog.js";
import type * as emails from "../emails.js";
import type * as events from "../events.js";
import type * as explore from "../explore.js";
import type * as exports from "../exports.js";
import type * as health from "../health.js";
import type * as helpers from "../helpers.js";
import type * as rateLimiter from "../rateLimiter.js";
import type * as registrations from "../registrations.js";
import type * as reports from "../reports.js";
import type * as search from "../search.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  analytics: typeof analytics;
  analyticsFilters: typeof analyticsFilters;
  audit: typeof audit;
  commandCenter: typeof commandCenter;
  crons: typeof crons;
  dashboard: typeof dashboard;
  emailLog: typeof emailLog;
  emails: typeof emails;
  events: typeof events;
  explore: typeof explore;
  exports: typeof exports;
  health: typeof health;
  helpers: typeof helpers;
  rateLimiter: typeof rateLimiter;
  registrations: typeof registrations;
  reports: typeof reports;
  search: typeof search;
  seed: typeof seed;
  settings: typeof settings;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
