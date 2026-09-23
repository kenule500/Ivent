"use client";

import { useRouter } from "next/navigation";
import { useAuth, SignIn } from "@clerk/nextjs";
import { useConvexQuery } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { Shield } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { data: currentUser, isLoading } = useConvexQuery(api.users.getCurrentUser);

  // If already signed in and is admin, redirect to dashboard
  if (!isLoading && isSignedIn && currentUser?.role === "super_admin") {
    router.replace("/admin/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500/10 via-background to-orange-500/10 p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground mt-2">Ivent Administration Dashboard</p>
        </div>

        {/* Clerk SignIn Component */}
        <div className="bg-card rounded-lg border p-6">
          <SignIn
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "bg-transparent shadow-none",
              },
            }}
            routing="hash"
            fallbackRedirectUrl="/admin/dashboard"
            signUpUrl="/admin/signup"
          />
        </div>

        {/* Security Note */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 mt-4">
          <Shield className="w-4 h-4 shrink-0" />
          <span>
            This area is restricted to authorized administrators only. All access attempts are logged.
          </span>
        </div>
      </div>
    </div>
  );
}