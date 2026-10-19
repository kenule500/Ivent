// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  params: { slug: "tech" } as Record<string, string>,
  useConvexQuery: vi.fn(),
  events: [] as Record<string, unknown>[],
}));

vi.mock("next/navigation", () => ({
  useParams: () => mocks.params,
  useRouter: () => ({ push: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/hooks/useConvexQuery", () => ({ useConvexQuery: mocks.useConvexQuery }));
vi.mock("@/convex/_generated/api", () => ({
  api: {
    explore: {
      getEventsByCategory: { __apiName: "explore.getEventsByCategory" },
      getEventsByLocation: { __apiName: "explore.getEventsByLocation" },
    },
  },
}));
vi.mock("@/components/event-card", () => ({
  default: ({ event }: { event: { title: string } }) => (
    <div data-testid="event-card">{event.title}</div>
  ),
}));
vi.mock("@/components/ui/pagination", () => ({
  Pagination: ({ children }: { children: React.ReactNode }) => <nav>{children}</nav>,
  PaginationContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaginationItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaginationPrevious: ({ onClick }: { onClick?: (event: React.MouseEvent) => void }) => (
    <button onClick={onClick}>Previous</button>
  ),
  PaginationNext: ({ onClick }: { onClick?: (event: React.MouseEvent) => void }) => (
    <button onClick={onClick}>Next</button>
  ),
  PaginationLink: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

import DynamicExplorePage from "@/app/(public)/explore/[slug]/page";

function makeEvents(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    _id: `event_${index}`,
    title: `Event ${index}`,
    slug: `event-${index}`,
    startDate: Date.now() + 86_400_000,
    registrationCount: 0,
  }));
}

beforeEach(() => {
  mocks.events = makeEvents(10);
  mocks.useConvexQuery.mockReset();
  mocks.useConvexQuery.mockReturnValue({ data: mocks.events, isLoading: false });
});

describe("AC-003: category and location routes", () => {
  test("AC-003: a category slug resolves and shows ten events with pagination", async () => {
    const user = userEvent.setup();
    mocks.params = { slug: "tech" };

    render(<DynamicExplorePage />);

    expect(screen.getByRole("heading", { name: "Technology" })).toBeInTheDocument();
    expect(screen.getByText("Showing 10 events")).toBeInTheDocument();
    expect(screen.getAllByTestId("event-card")).toHaveLength(10);

    await user.click(screen.getByRole("button", { name: "Next" }));

    const offsets = mocks.useConvexQuery.mock.calls.map(
      ([, args]) => (args as { offset?: number } | undefined)?.offset
    );
    expect(offsets).toContain(10);
  });

  test("AC-003: a city-state slug resolves and requests that location", () => {
    mocks.params = { slug: "port-harcourt-rivers" };

    render(<DynamicExplorePage />);

    expect(screen.getByRole("heading", { name: "Events in Port Harcourt" })).toBeInTheDocument();
    expect(screen.getByText("Rivers, Nigeria")).toBeInTheDocument();

    const call = mocks.useConvexQuery.mock.calls[0];
    expect(call[1]).toMatchObject({ city: "Port Harcourt", state: "Rivers", limit: 10, offset: 0 });
  });
});

describe("AC-004: unknown slugs", () => {
  test("AC-004: a slug that is neither a category nor a location renders not-found", () => {
    mocks.params = { slug: "atlantis-nowhere" };

    expect(() => render(<DynamicExplorePage />)).toThrow("NEXT_NOT_FOUND");
  });
});
