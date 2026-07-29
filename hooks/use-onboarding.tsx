"use client";

import { usePathname, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { FunctionReference, FunctionArgs } from "convex/server";

// Pages that require onboarding (attendee-centered)
const ATTENDEE_PAGES = ["/explore", "/events", "/my-tickets", "/profile"];

// Clean dynamic utility wrapper with correct unknown typing to clear the 'Unexpected any' lint error
function useConvexQuery<Query extends FunctionReference<"query">>(
  queryRef: Query,
  args?: FunctionArgs<Query>
) {
  const data = useQuery(queryRef, args ?? ({} as unknown as FunctionArgs<Query>));
  const isLoading = data === undefined;
  return { data, isLoading };
}

export function useOnboarding() {
  const pathname = usePathname();
  const router = useRouter();

  // 1. Fetch current user data
  const { data: currentUser, isLoading } = useConvexQuery(
    api.users.getCurrentUser
  );

  // 2. Derived State: Check if current page route requires onboarding
  const requiresOnboarding = ATTENDEE_PAGES.some((page) =>
    pathname.startsWith(page)
  );

  // 3. Derived State: Compute directly if we should display the onboarding modal
  const showOnboarding = 
    !isLoading && 
    !!currentUser && 
    !currentUser.hasCompletedOnboarding && 
    requiresOnboarding;

  const handleOnboardingComplete = () => {
    // Refresh to update Next.js router data cache
    router.refresh();
  };

  const handleOnboardingSkip = () => {
    // Redirect back to homepage if they choose to skip
    router.push("/");
  };

  return {
    showOnboarding,
    handleOnboardingComplete,
    handleOnboardingSkip,
    needsOnboarding: currentUser && !currentUser.hasCompletedOnboarding,
  };
}
