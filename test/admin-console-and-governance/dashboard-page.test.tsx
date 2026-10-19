// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  useConvexQuery: vi.fn(),
  state: { data: null as null | Record<string, number>, isLoading: false, error: null as null | Error },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/hooks/useConvexQuery", () => ({ useConvexQuery: mocks.useConvexQuery }));
vi.mock("@/convex/_generated/api", () => ({
  api: {
    admin: {
      getDashboardStats: { __apiName: "admin.getDashboardStats" },
      getAllUsers: { __apiName: "admin.getAllUsers" },
      getAllEvents: { __apiName: "admin.getAllEvents" },
    },
  },
}));

import AdminDashboard from "@/app/admin/dashboard/page";

beforeEach(() => {
  mocks.push.mockReset();
  mocks.state = {
    data: { totalUsers: 12, totalEvents: 7, totalRegistrations: 34, upcomingEvents: 5 },
    isLoading: false,
    error: null,
  };
  mocks.useConvexQuery.mockReset();
  mocks.useConvexQuery.mockImplementation((ref: { __apiName?: string }) => {
    if (ref.__apiName === "admin.getAllUsers" || ref.__apiName === "admin.getAllEvents") {
      return { data: [], isLoading: false, error: null };
    }
    return mocks.state;
  });
});

describe("AC-002: platform totals on the dashboard", () => {
  test("AC-002: totals and upcoming counts are rendered", () => {
    render(<AdminDashboard />);

    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Total Events")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Total Registrations")).toBeInTheDocument();
    expect(screen.getByText("34")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Events")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  test("AC-002: a loading state is shown while stats load", () => {
    mocks.state = { data: null, isLoading: true, error: null };
    const { container } = render(<AdminDashboard />);

    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  test("AC-002: an access-denied state is shown on error and the visitor is redirected", async () => {
    mocks.state = { data: null, isLoading: false, error: new Error("Admin access required") };

    render(<AdminDashboard />);

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/admin"));
  });
});
