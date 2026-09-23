import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

// User-facing protected routes — use Clerk's hosted sign-in
const isUserProtected = createRouteMatcher([
  "/my-events(.*)",
  "/create-event(.*)",
  "/my-tickets(.*)",
]);

// Admin routes that are PUBLIC (login + signup)
const ADMIN_PUBLIC_PATHS = ["/admin", "/admin/signup"];

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId, redirectToSignIn } = await auth();
  const pathname = req.nextUrl.pathname;

  // 1️⃣ User protected routes → Clerk sign-in
  if (!userId && isUserProtected(req)) {
    return redirectToSignIn();
  }

  // 2️⃣ Admin routes → custom /admin login (unless it's a public admin path)
  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminPublic = ADMIN_PUBLIC_PATHS.includes(pathname);

  if (!userId && isAdminRoute && !isAdminPublic) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // 3️⃣ Security headers (Helmet equivalents)
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Always run for Clerk frontend API routes
    "/__clerk/(.*)",
  ],
};