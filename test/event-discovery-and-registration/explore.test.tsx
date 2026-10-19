// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  useConvexQuery: vi.fn(),
  responses: {} as Record<string, { data: unknown; isLoading?: boolean }>,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/hooks/useConvexQuery", () => ({ useConvexQuery: mocks.useConvexQuery }));
vi.mock("@/convex/_generated/api", () => ({
  api: {
    users: { getCurrentUser: { __apiName: "users.getCurrentUser" } },
    explore: {
      getFeaturedEvents: { __apiName: "explore.getFeaturedEvents" },
      getEventsByLocation: { __apiName: "explore.getEventsByLocation" },
      getPopularEvents: { __apiName: "explore.getPopularEvents" },
      getCategoryCounts: { __apiName: "explore.getCategoryCounts" },
    },
  },
}));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("embla-carousel-autoplay", () => ({
  default: () => ({ stop: vi.fn(), reset: vi.fn() }),
}));
vi.mock("@/components/ui/carousel", () => ({
  Carousel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselPrevious: () => null,
  CarouselNext: () => null,
}));
vi.mock("@/components/event-card", () => ({
  default: ({ event }: { event: { title: string } }) => (
    <div data-testid="event-card">{event.title}</div>
  ),
}));

import ExplorePage from "@/app/(public)/explore/page";

function makeEvent(id: string) {
  return {
    _id: id,
    title: `Event ${id}`,
    slug: `event-${id}`,
    description: "Description",
    city: "Port Harcourt",
    state: "Rivers",
    country: "Nigeria",
    startDate: Date.now() + 86_400_000,
    registrationCount: 3,
    themeColor: "#1e3a8a",
  };
}

beforeEach(() => {
  mocks.useConvexQuery.mockReset();
  mocks.useConvexQuery.mockImplementation((ref: { __apiName?: string }) => {
    const response = mocks.responses[ref.__apiName ?? ""];
    return { data: response?.data, isLoading: response?.isLoading ?? false };
  });
  mocks.responses = {
    "users.getCurrentUser": {
      data: { location: { city: "Port Harcourt", state: "Rivers", country: "Nigeria" } },
    },
    "explore.getFeaturedEvents": {
      data: [makeEvent("1"), makeEvent("2"), makeEvent("3"), makeEvent("4")],
    },
    "explore.getEventsByLocation": { data: [makeEvent("5"), makeEvent("6")] },
    "explore.getPopularEvents": {
      data: ["7", "8", "9", "10", "11", "12"].map(makeEvent),
    },
    "explore.getCategoryCounts": { data: { tech: 2 } },
  };
});

function callFor(name: string) {
  return mocks.useConvexQuery.mock.calls.find(
    ([ref]) => (ref as { __apiName?: string }).__apiName === name
  );
}

describe("AC-001: explore sections", () => {
  test("AC-001: featured, local, popular and category sections render with counts", () => {
    render(<ExplorePage />);

    expect(screen.getByText("Discover Events")).toBeInTheDocument();
    // Featured events render inside the carousel; local (2) + popular (6) use EventCard.
    expect(screen.getAllByTestId("event-card")).toHaveLength(8);
    expect(screen.getByRole("heading", { name: "Event 1" })).toBeInTheDocument();
    expect(screen.getByText("Events Near You")).toBeInTheDocument();
    expect(screen.getByText("Happening in Port Harcourt")).toBeInTheDocument();
    expect(screen.getByText("Popular Across Nigeria")).toBeInTheDocument();
    expect(screen.getByText("2 Events")).toBeInTheDocument();
  });

  test("AC-001: local events are requested for the saved city and state, and sections are capped", () => {
    render(<ExplorePage />);

    const localCall = callFor("explore.getEventsByLocation");
    const featuredCall = callFor("explore.getFeaturedEvents");
    const popularCall = callFor("explore.getPopularEvents");

    expect(localCall?.[1]).toMatchObject({
      city: "Port Harcourt",
      state: "Rivers",
      limit: 4,
    });
    expect(featuredCall?.[1]).toMatchObject({ limit: 4 });
    expect(popularCall?.[1]).toMatchObject({ limit: 6 });
  });
});

describe("AC-002: per-section loading and empty states", () => {
  test("AC-002: loading sections do not block the rest of the page", () => {
    mocks.responses["explore.getFeaturedEvents"] = { data: undefined, isLoading: true };
    mocks.responses["explore.getEventsByLocation"] = { data: undefined, isLoading: true };
    mocks.responses["explore.getPopularEvents"] = { data: undefined, isLoading: true };

    const { container } = render(<ExplorePage />);

    expect(container.querySelectorAll(".animate-spin").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.getByText("Browse by Category")).toBeInTheDocument();
  });

  test("AC-002: each section shows its own empty state", () => {
    mocks.responses["explore.getFeaturedEvents"] = { data: [] };
    mocks.responses["explore.getEventsByLocation"] = { data: [] };
    mocks.responses["explore.getPopularEvents"] = { data: [] };

    render(<ExplorePage />);

    expect.soft(screen.queryByText(/no featured events/i)).toBeInTheDocument();
    expect.soft(screen.queryByText(/no events near you/i)).toBeInTheDocument();
    expect.soft(screen.getByText("No popular events yet.")).toBeInTheDocument();
  });
});
