// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  useConvexQuery: vi.fn(),
  loading: false,
  responses: {} as Record<string, unknown>,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/hooks/useConvexQuery", () => ({ useConvexQuery: mocks.useConvexQuery }));
vi.mock("@/hooks/usePlatformSettings", () => ({
  usePlatformSettings: () => ({
    settings: null,
    isLoading: false,
    country: "US",
    currency: "USD",
    timezone: "UTC",
    featureFlags: {
      commandPalette: true,
      reports: true,
      broadcasts: true,
      feedbackInbox: true,
      systemHealth: true,
    },
  }),
}));
vi.mock("@/convex/_generated/api", () => ({
  api: {
    commandCenter: {
      getTrends: { __apiName: "commandCenter.getTrends" },
      getActionQueue: { __apiName: "commandCenter.getActionQueue" },
      getToday: { __apiName: "commandCenter.getToday" },
    },
    admin: {
      getRecentAudit: { __apiName: "admin.getRecentAudit" },
    },
  },
}));

import AdminDashboard from "@/app/admin/dashboard/page";

const now = Date.now();

function trendMetric(current: number, previous: number) {
  return { current, previous, sparkline: Array.from({ length: 30 }, () => 0) };
}

beforeEach(() => {
  mocks.loading = false;
  mocks.responses = {
    "commandCenter.getTrends": {
      days: 30,
      asOf: now,
      window: { start: now - 30 * 86_400_000, end: now },
      previousWindow: { start: now - 60 * 86_400_000, end: now - 30 * 86_400_000 },
      metrics: {
        users: trendMetric(4, 2),
        events: trendMetric(3, 3),
        registrations: trendMetric(12, 9),
        revenue: trendMetric(500, 0),
      },
    },
    "commandCenter.getActionQueue": {
      queues: {
        expiringInvites: {
          count: 1,
          href: "/admin/invites",
          previews: [{ label: "pending@example.com" }],
        },
        atCapacity: { count: 0, href: "/admin/events", previews: [] },
        staleFeedback: { count: 0, href: "/admin/feedback", previews: [] },
        failedEmails: { count: 0, href: "/admin/health", previews: [] },
      },
    },
    "commandCenter.getToday": {
      timezone: "UTC",
      events: [
        {
          id: "event_1",
          title: "Today Summit",
          city: "Lagos",
          confirmed: 4,
          checkedIn: 2,
          capacity: 10,
          rate: 0.5,
        },
      ],
    },
    "admin.getRecentAudit": [
      {
        _id: "audit_1",
        actorName: "Admin",
        action: "event.deleted",
        targetLabel: "audit-0",
        createdAt: now - 60_000,
      },
    ],
  };
  mocks.useConvexQuery.mockReset();
  mocks.useConvexQuery.mockImplementation((ref: { __apiName?: string }) => ({
    data: mocks.loading ? null : mocks.responses[ref.__apiName ?? ""],
    isLoading: mocks.loading,
    error: null,
  }));
});

describe("admin dashboard command center", () => {
  test("renders the trends, action queue, today's events and recent audit activity", () => {
    render(<AdminDashboard />);

    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("What changed and what needs attention today.")).toBeInTheDocument();

    expect(screen.getByText("New users")).toBeInTheDocument();
    expect(screen.getByText("New events")).toBeInTheDocument();
    expect(screen.getByText("Registrations")).toBeInTheDocument();
    expect(screen.getByText("Estimated revenue")).toBeInTheDocument();

    expect(screen.getByText("Action queue")).toBeInTheDocument();
    expect(screen.getByText("Invites expiring in 48h")).toBeInTheDocument();
    expect(screen.getByText("pending@example.com")).toBeInTheDocument();
    expect(screen.getByText("Events at capacity")).toBeInTheDocument();
    expect(screen.getByText("Failed emails (24h)")).toBeInTheDocument();

    expect(screen.getByText("Today Summit")).toBeInTheDocument();
    expect(screen.getByText("2/4 checked in")).toBeInTheDocument();
    expect(screen.getByText(/50% check-in rate/)).toBeInTheDocument();

    expect(screen.getByText("Recent admin activity")).toBeInTheDocument();
    expect(screen.getByText("event.deleted")).toBeInTheDocument();
    expect(screen.getByText("audit-0")).toBeInTheDocument();
  });

  test("shows a loading state while the command center panels load", () => {
    mocks.loading = true;
    render(<AdminDashboard />);

    expect(screen.getAllByRole("status", { name: "Loading" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Today Summit")).not.toBeInTheDocument();
  });

  test("shows positive empty states when nothing needs attention", () => {
    mocks.responses = {
      "commandCenter.getTrends": {
        days: 30,
        asOf: now,
        metrics: {
          users: trendMetric(0, 0),
          events: trendMetric(0, 0),
          registrations: trendMetric(0, 0),
          revenue: trendMetric(0, 0),
        },
      },
      "commandCenter.getActionQueue": {
        queues: {
          expiringInvites: { count: 0, href: "/admin/invites", previews: [] },
          atCapacity: { count: 0, href: "/admin/events", previews: [] },
          staleFeedback: { count: 0, href: "/admin/feedback", previews: [] },
          failedEmails: { count: 0, href: "/admin/health", previews: [] },
        },
      },
      "commandCenter.getToday": { timezone: "UTC", events: [] },
      "admin.getRecentAudit": [],
    };

    render(<AdminDashboard />);

    expect(screen.getByText("Nothing needs attention")).toBeInTheDocument();
    expect(screen.getByText("No events today")).toBeInTheDocument();
    expect(screen.getByText("No admin activity yet")).toBeInTheDocument();
  });
});
