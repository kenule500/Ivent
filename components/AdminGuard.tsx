"use client";

import { useConvexQuery } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Loader2, ShieldAlert } from "lucide-react";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { data: currentUser, isLoading } = useConvexQuery(api.users.getCurrentUser);

  const isAdmin =
    currentUser?.role === "admin" || currentUser?.role === "super_admin";

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/admin");
      return;
    }
    if (!isLoading && isSignedIn && !isAdmin) {
      router.replace("/admin");
    }
  }, [isLoaded, isSignedIn, isLoading, isAdmin, router]);

  // Block rendering until we know the user is an admin
  if (!isLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Not signed in — don't render anything (redirect will fire)
  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Signed in but not admin — don't render children
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <ShieldAlert className="w-12 h-12 text-red-500" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">
          You don&apos;t have permission to access this page.
        </p>
      </div>
    );
  }

  // Only render children when we KNOW the user is an admin
  return <>{children}</>;
}