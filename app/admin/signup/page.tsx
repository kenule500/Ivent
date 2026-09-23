"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, SignUp, useUser } from "@clerk/nextjs";
import { useConvexMutation } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Shield, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  // Pre-fill from email invite link (?code=...&email=...)
  const [inviteCode, setInviteCode] = useState(
    searchParams.get("code") || ""
  );
  const [email, setEmail] = useState(searchParams.get("email") || "");

  const { mutate: verifyInvite, isLoading: verifying } = useConvexMutation(
    api.admin.verifyInviteCode
  );

  const handleVerifyInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const userEmail = email || user?.primaryEmailAddress?.emailAddress;

      if (!userEmail) {
        toast.error("Please enter your email");
        return;
      }

      await verifyInvite({
        email: userEmail,
        inviteCode,
      });

      toast.success("Admin access granted! 🎉");
      router.push("/admin/dashboard");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Invalid invite code or email";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500/10 via-background to-orange-500/10 p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Admin Sign Up</h1>
          <p className="text-muted-foreground mt-2">
            Create your admin account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admin Registration</CardTitle>
            <CardDescription>
              Enter your admin invite code to create an account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isSignedIn ? (
              <>
                <div className="bg-card rounded-lg border p-4">
                  <SignUp
                    appearance={{
                      elements: {
                        rootBox: "mx-auto",
                        card: "bg-transparent shadow-none",
                      },
                    }}
                    routing="hash"
                    fallbackRedirectUrl="/admin/signup"
                    signInUrl="/admin"
                  />
                </div>

                <div className="text-center text-sm">
                  Already have an account?{" "}
                  <button
                    onClick={() => router.push("/admin")}
                    className="text-purple-500 hover:text-purple-400 font-medium"
                  >
                    Sign In
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-500">
                    ✓ Account created successfully!
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Signed in as{" "}
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                </div>

                <form onSubmit={handleVerifyInvite} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@ivents.com"
                      value={
                        email || user?.primaryEmailAddress?.emailAddress || ""
                      }
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">Admin Invite Code</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="inviteCode"
                        type="text"
                        placeholder="Enter your invite code"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={verifying}
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify & Grant Admin Access"
                    )}
                  </Button>
                </form>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Shield className="w-4 h-4 shrink-0" />
              <span>
                Admin accounts are restricted. Contact the super admin for an
                invite code.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}