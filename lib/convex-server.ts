import { ConvexHttpClient } from "convex/browser";

/**
 * A plain HTTP Convex client for Server Components and metadata generators.
 * It is intentionally unauthenticated: only public queries are called here.
 */
let client: ConvexHttpClient | null = null;

export function getConvexServerClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
  }

  if (!client) client = new ConvexHttpClient(url);
  return client;
}
