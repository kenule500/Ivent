// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  profile: null as unknown,
  mutate: vi.fn(),
  openUserProfile: vi.fn(),
  signOut: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({
    openUserProfile: mocks.openUserProfile,
    signOut: mocks.signOut,
  }),
}));
vi.mock("@/hooks/useConvexQuery", () => ({
  useConvexQuery: () => ({ data: mocks.profile, isLoading: false, error: null }),
  useConvexMutation: () => ({ mutate: mocks.mutate, isLoading: false }),
}));
vi.mock("@/convex/_generated/api", () => ({
  api: {
    settings: {
      getMyProfile: { __apiName: "settings.getMyProfile" },
      updateMyPreferences: { __apiName: "settings.updateMyPreferences" },
    },
  },
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import AdminSettingsPage from "@/app/admin/settings/page";

const fullProfile = {
  _id: "user_1",
  name: "Admin Person",
  email: "admin@example.com",
  image: null,
  role: "admin",
  createdAt: Date.UTC(2025, 0, 15),
  preferences: {
    emailOnNewEvent: false,
    emailOnNewRegistration: true,
    emailOnNewAdminInvite: false,
    emailOnNewUser: true,
  },
  // Fields that belong to attendee profiles and must not be rendered here.
  location: { city: "Lagos", country: "Nigeria" },
  interests: ["tech", "music"],
  hasCompletedOnboarding: true,
};

beforeEach(() => {
  mocks.profile = null;
  mocks.mutate.mockReset();
  mocks.toastSuccess.mockReset();
  mocks.toastError.mockReset();
});

describe("admin settings page", () => {
  test("AC-033: the page omits the attendee Onboarding row and does not render attendee-only fields", () => {
    mocks.profile = fullProfile;
    render(<AdminSettingsPage />);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByText("Account Information")).toBeInTheDocument();
    expect(screen.getByText("Email Notifications")).toBeInTheDocument();
    expect(screen.getByText("Admin Person")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();

    expect(screen.queryByText(/onboarding/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/interests/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^location$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Lagos/)).not.toBeInTheDocument();
  });

  test("AC-034: a profile without optional image, preferences or createdAt renders honest defaults", () => {
    mocks.profile = {
      _id: "user_2",
      name: "Minimal Admin",
      email: "minimal@example.com",
      role: "admin",
    };
    render(<AdminSettingsPage />);

    expect(screen.getByText("Minimal Admin")).toBeInTheDocument();
    expect(screen.getByText("minimal@example.com")).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getAllByText("Admin").length).toBeGreaterThan(0);
    expect(screen.queryByText("Pending")).not.toBeInTheDocument();
    expect(screen.queryByText("N/A")).not.toBeInTheDocument();

    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(4);
    for (const toggle of switches) {
      expect(toggle).toBeChecked();
    }
    expect(screen.getByText("New user registered")).toBeInTheDocument();
    expect(screen.getByText("New admin invite accepted")).toBeInTheDocument();
  });
});
