// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  report: {
    asOf: Date.now(),
    timezone: "UTC",
    event: {
      id: "event_1",
      title: "Quiet launch",
      startDate: Date.now() + 86_400_000,
      endDate: Date.now() + 172_800_000,
      city: null,
      country: null,
      category: "tech",
      capacity: 50,
      ticketType: "paid",
      ticketPrice: 10,
      organizer: "Admin",
    },
    attendance: {
      registered: 0,
      confirmed: 0,
      checkedIn: 0,
      noShow: 0,
      cancelled: 0,
      checkInRate: 0,
      capacityUtilisation: 0,
    },
    revenue: 0,
    trend: [{ key: "2026-10-20", checkedIn: 0 }],
    todayWindow: { start: 0, end: 1 },
    registrationScanLimit: 10_000,
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ eventId: "event_1" }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/hooks/useConvexQuery", () => ({
  useConvexQuery: () => ({ data: mocks.report, isLoading: false, error: null }),
}));
vi.mock("@/hooks/usePlatformSettings", () => ({
  usePlatformSettings: () => ({
    currency: "USD",
    timezone: "UTC",
    featureFlags: {},
    settings: null,
    isLoading: false,
  }),
}));
vi.mock("@/components/admin/export-button", () => ({
  ExportButton: () => <button type="button">Export report CSV</button>,
}));

import EventReportPage from "@/app/admin/reports/[eventId]/page";

describe("event report page", () => {
  test("AC-020: an event with no registrations shows zeros, an explanatory empty state, print and CSV actions", () => {
    const { container } = render(<EventReportPage />);

    expect(container.querySelector(".report-page")).not.toBeNull();
    expect(container.querySelector(".no-print")).not.toBeNull();
    expect(screen.getByText("No registrations yet")).toBeInTheDocument();
    expect(
      screen.getByText(/This event has no registrations, so attendance, check-in, and revenue are all zero/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print / PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export report CSV" })).toBeInTheDocument();
    // The title appears once in the print masthead and once in the on-screen card.
    expect(screen.getAllByText("Quiet launch")).toHaveLength(2);
    expect(screen.queryByText("Check-ins over time")).not.toBeInTheDocument();
  });
});
