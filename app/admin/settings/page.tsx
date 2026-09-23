"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useConvexQuery, useConvexMutation } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  User,
  Mail,
  Calendar,
  Shield,
  Crown,
  Bell,
  Lock,
  LogOut,
  ExternalLink,
  Save,
} from "lucide-react";

export default function AdminSettingsPage() {
  const { openUserProfile, signOut } = useClerk();

  const { data: profile, isLoading } = useConvexQuery(api.settings.getMyProfile);
  const { mutate: updatePreferences, isLoading: saving } = useConvexMutation(
    api.settings.updateMyPreferences
  );

  // Local state for preferences
  const [preferences, setPreferences] = useState({
    emailOnNewEvent: true,
    emailOnNewRegistration: true,
    emailOnNewAdminInvite: true,
    emailOnNewUser: true,
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Track the last synced preferences (avoids setState in effect)
  const [syncedPreferences, setSyncedPreferences] = useState(
    profile?.preferences
  );

  if (
    profile?.preferences &&
    profile.preferences !== syncedPreferences
  ) {
    setSyncedPreferences(profile.preferences);
    setPreferences(profile.preferences);
    setHasChanges(false);
  }

  const togglePreference = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  const handleSavePreferences = async () => {
    try {
      await updatePreferences({ preferences });
      toast.success("Preferences saved");
      setHasChanges(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save preferences";
      toast.error(message);
    }
  };

  const handleSignOutEverywhere = async () => {
    if (!confirm("Sign out of all devices? You'll need to sign in again."))
      return;

    try {
      await signOut({ redirectUrl: "/admin" });
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Unable to load profile</p>
      </div>
    );
  }

  const roleConfig = {
    super_admin: {
      label: "Super Admin",
      icon: Crown,
      className: "bg-purple-500/10 text-purple-500",
    },
    admin: {
      label: "Admin",
      icon: Shield,
      className: "bg-blue-500/10 text-blue-500",
    },
    user: {
      label: "User",
      icon: User,
      className: "bg-muted text-muted-foreground",
    },
  };

  const role = roleConfig[profile.role || "user"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Two-column grid on lg+ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Your name and email are synced with your Clerk account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile.image} alt={profile.name} />
                  <AvatarFallback className="bg-purple-500/10 text-purple-500 text-xl">
                    {profile.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-semibold truncate">
                    {profile.name}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{profile.email}</span>
                  </p>
                </div>
                <Badge className={`gap-1 shrink-0 ${role.className}`}>
                  <role.icon className="w-3 h-3" />
                  {role.label}
                </Badge>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Edit Profile</p>
                  <p className="text-xs text-muted-foreground">
                    Change your name, email, or password via Clerk
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => openUserProfile()}
                  className="gap-2 shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Clerk Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-500" />
                Security
              </CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Password</p>
                  <p className="text-xs text-muted-foreground">
                    Change your password in your Clerk account
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => openUserProfile()}
                  className="gap-2 shrink-0"
                >
                  <Lock className="w-4 h-4" />
                  Change Password
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Sign Out Everywhere</p>
                  <p className="text-xs text-muted-foreground">
                    Sign out of all devices and sessions
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleSignOutEverywhere}
                  className="gap-2 text-red-500 hover:text-red-700 shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out All
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow icon={User} label="User ID" value={profile._id} mono />
              <InfoRow
                icon={Calendar}
                label="Member Since"
                value={
                  profile.createdAt
                    ? format(profile.createdAt, "MMMM d, yyyy")
                    : "Unknown"
                }
              />
              <InfoRow icon={Shield} label="Role" value={role.label} />
              <InfoRow
                icon={Bell}
                label="Onboarding"
                value={
                  profile.hasCompletedOnboarding ? "Completed" : "Pending"
                }
              />
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-purple-500" />
                    Email Notifications
                  </CardTitle>
                  <CardDescription>
                    Choose which events trigger an email notification to you
                  </CardDescription>
                </div>
                {hasChanges && (
                  <Button
                    onClick={handleSavePreferences}
                    disabled={saving}
                    size="sm"
                    className="gap-2 shrink-0"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <PreferenceToggle
                label="New user registered"
                description="Get notified when a new user signs up"
                checked={preferences.emailOnNewUser}
                onToggle={() => togglePreference("emailOnNewUser")}
              />
              <Separator />
              <PreferenceToggle
                label="New event created"
                description="Get notified when an organizer creates an event"
                checked={preferences.emailOnNewEvent}
                onToggle={() => togglePreference("emailOnNewEvent")}
              />
              <Separator />
              <PreferenceToggle
                label="New registration"
                description="Get notified when someone registers for an event"
                checked={preferences.emailOnNewRegistration}
                onToggle={() => togglePreference("emailOnNewRegistration")}
              />
              <Separator />
              <PreferenceToggle
                label="New admin invite accepted"
                description="Get notified when an invited admin accepts their invite"
                checked={preferences.emailOnNewAdminInvite}
                onToggle={() => togglePreference("emailOnNewAdminInvite")}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============ HELPER COMPONENTS ============

function InfoRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span
        className={`text-sm font-medium truncate ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function PreferenceToggle({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        className="shrink-0"
      />
    </div>
  );
}